import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { CurrentAuth, type AuthContext, SessionAuthGuard } from "../../auth";
import { SeedOwnerRoleUseCase } from "../../access-control";
import { RecordAuditEntryUseCase } from "../../audit";
import { ListCompaniesUseCase } from "../../companies";
import { EnableAllCatalogAppsUseCase } from "../../app-registry";
import { ProvisionTenantUseCase } from "../application/provision-tenant.use-case";
import { ListMyTenantsUseCase } from "../application/list-my-tenants.use-case";
import { ProvisionTenantDto } from "./dto/provision-tenant.dto";
import { ProvisionedTenantResponseDto } from "./dto/provisioned-tenant-response.dto";
import { TenantSummaryResponseDto, TenantExecutionContextResponseDto } from "./dto/tenant-summary-response.dto";
import { CompanyResponseDto } from "./dto/company-response.dto";
import { TenantContextGuard } from "./tenant-context.guard";
import { CurrentTenantContext } from "./current-tenant-context.decorator";
import { handleTenantError } from "./tenant-error.mapper";
import type { TenantExecutionContext } from "../application/tenant-execution-context";

@ApiTags("Tenants")
@ApiBearerAuth("session")
@Controller("api/v1/tenants")
@UseGuards(SessionAuthGuard)
export class TenantsController {
  constructor(
    private readonly provisionTenant: ProvisionTenantUseCase,
    private readonly listMyTenants: ListMyTenantsUseCase,
    private readonly seedOwnerRole: SeedOwnerRoleUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
    private readonly listCompanies: ListCompaniesUseCase,
    private readonly enableAllCatalogApps: EnableAllCatalogAppsUseCase,
  ) {}

  /**
   * Onboarding: "create tenant" step of MASTER_SPEC §68's "crear cuenta →
   * crear empresa" flow. Seeding the Owner role is a second step after
   * provisioning commits, not part of the same DB transaction (no saga/
   * outbox exists yet, docs/WORK_QUEUE.md) — if it throws, the tenant is
   * left provisioned but ownerless-of-permissions, a known gap documented
   * in docs/SECURITY.md rather than something worth a compensating
   * transaction for at Foundation scale. Same non-atomicity applies to the
   * two audit entries recorded below: best-effort, right after each write.
   *
   * The owner notification is deliberately NOT called directly here anymore
   * (see session 18/19 history) — `PrismaTenantProvisioningRepository.create()`
   * already appends `tenancy.tenant.provisioned.v1` to the outbox in the same
   * transaction, and `apps/worker`'s `TenantProvisionedNotificationHandler`
   * consumes it idempotently (ADR-008's inbox) to request the notification.
   * This is genuinely event-driven now, not a direct call dressed up as one.
   *
   * `enableAllCatalogApps` (docs/DECISIONS.md ADR-015) is a third,
   * equally non-atomic step: V1 has no per-app opt-in step in onboarding
   * yet (MASTER_SPEC §68's "elegir aplicaciones" isn't built), so every
   * new tenant starts with the entire current app catalog enabled —
   * preserving the platform's pre-ADR-015 behavior (every module worked
   * for every tenant) now that `AppEnablementGuard` genuinely enforces
   * enablement on business modules' routes. The tenant can disable
   * individual apps for real afterward from the existing "Apps" screen.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Provision a new tenant (MASTER_SPEC §68 \"crear empresa\") with the caller as owner." })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProvisionedTenantResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "Slug already in use." })
  async provision(
    @Body() dto: ProvisionTenantDto,
    @CurrentAuth() auth: AuthContext,
    @Req() request: Request,
  ): Promise<ProvisionedTenantResponseDto> {
    try {
      const result = await this.provisionTenant.execute({
        slug: dto.slug,
        name: dto.name,
        ownerUserId: auth.user.id,
        organization: dto.organization,
        company: dto.company,
        correlationId: request.correlationId,
      });
      await this.recordAuditEntry.execute({
        userId: auth.user.id,
        tenantId: result.tenant.id,
        action: "tenant.provisioned",
        resource: "Tenant",
        resourceId: result.tenant.id,
        newValues: {
          slug: result.tenant.slug,
          name: result.tenant.name,
          organizationId: result.organization.id,
          companyId: result.company?.id ?? null,
        },
        ipAddress: request.ip,
        userAgent: request.header("user-agent"),
        correlationId: request.correlationId,
      });

      await this.seedOwnerRole.execute(result.tenant.id, result.ownerMembership.id);
      await this.recordAuditEntry.execute({
        userId: null,
        tenantId: result.tenant.id,
        action: "access_control.owner_role.seeded",
        resource: "RoleAssignment",
        newValues: { membershipId: result.ownerMembership.id },
        correlationId: request.correlationId,
      });

      const enabledAppKeys = await this.enableAllCatalogApps.execute(result.tenant.id);
      await this.recordAuditEntry.execute({
        userId: null,
        tenantId: result.tenant.id,
        action: "app_registry.tenant_apps.bulk_enabled",
        resource: "TenantApp",
        newValues: { keys: enabledAppKeys },
        correlationId: request.correlationId,
      });

      return ProvisionedTenantResponseDto.fromResult(result);
    } catch (error) {
      handleTenantError(error);
    }
  }

  /** Tenant picker: "which tenants can I access" before any tenant is selected. */
  @Get()
  @ApiOperation({ summary: "Tenants the current user has an active membership in — the tenant picker." })
  @ApiResponse({ status: HttpStatus.OK, type: [TenantSummaryResponseDto] })
  async listMine(@CurrentAuth() auth: AuthContext): Promise<TenantSummaryResponseDto[]> {
    const summaries = await this.listMyTenants.execute(auth.user.id);
    return summaries.map((summary) => TenantSummaryResponseDto.fromDomain(summary));
  }

  /**
   * Company picker: "which companies exist in this tenant" — the read that
   * lets a client discover a `companyId` to send as `X-Company-Id` on every
   * later request. `ResolveTenantContextUseCase`/`GET .../current` never
   * invent one on their own (they only ever echo back a `companyId` the
   * caller already supplied), so without this endpoint a client that lost
   * its in-memory company selection (e.g. reopening a tenant from the
   * tenant list after the one-time onboarding response) had no way to
   * recover it — a real gap found and closed after Sales/Payments shipped
   * with no way to reach them outside onboarding. Guarded by
   * `TenantContextGuard` alone (no `X-Company-Id` required) since
   * discovering companies is exactly what a caller does *before* it has one.
   */
  @Get("companies")
  @UseGuards(TenantContextGuard)
  @ApiTenantHeaders()
  @ApiOperation({ summary: "List the active companies in the tenant resolved from X-Tenant-Slug." })
  @ApiResponse({ status: HttpStatus.OK, type: [CompanyResponseDto] })
  async companies(@CurrentTenantContext() tenantContext: TenantExecutionContext): Promise<CompanyResponseDto[]> {
    const companies = await this.listCompanies.execute(tenantContext.tenantId);
    return companies.map((company) => CompanyResponseDto.fromDomain(company));
  }

  /**
   * Demonstrates the full auth -> tenant-context chain other tenant-scoped
   * controllers should follow: `@UseGuards(SessionAuthGuard, TenantContextGuard)`
   * plus the `X-Tenant-Slug` header (docs/MULTITENANCY.md §6.1).
   */
  @Get("current")
  @UseGuards(TenantContextGuard)
  @ApiTenantHeaders()
  @ApiOperation({ summary: "Resolve the tenant context for the caller's X-Tenant-Slug header." })
  @ApiResponse({ status: HttpStatus.OK, type: TenantExecutionContextResponseDto })
  current(@CurrentTenantContext() tenantContext: TenantExecutionContext): TenantExecutionContextResponseDto {
    return TenantExecutionContextResponseDto.fromDomain(tenantContext);
  }
}
