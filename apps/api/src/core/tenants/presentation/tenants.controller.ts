import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { CurrentAuth, type AuthContext, SessionAuthGuard } from "../../auth";
import { SeedOwnerRoleUseCase } from "../../access-control";
import { RecordAuditEntryUseCase } from "../../audit";
import { ProvisionTenantUseCase } from "../application/provision-tenant.use-case";
import { ListMyTenantsUseCase, type MyTenantSummary } from "../application/list-my-tenants.use-case";
import { ProvisionTenantDto } from "./dto/provision-tenant.dto";
import { ProvisionedTenantResponseDto } from "./dto/provisioned-tenant-response.dto";
import { TenantContextGuard } from "./tenant-context.guard";
import { CurrentTenantContext } from "./current-tenant-context.decorator";
import { handleTenantError } from "./tenant-error.mapper";
import type { TenantExecutionContext } from "../application/tenant-execution-context";

@Controller("api/v1/tenants")
@UseGuards(SessionAuthGuard)
export class TenantsController {
  constructor(
    private readonly provisionTenant: ProvisionTenantUseCase,
    private readonly listMyTenants: ListMyTenantsUseCase,
    private readonly seedOwnerRole: SeedOwnerRoleUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
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
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
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

      return ProvisionedTenantResponseDto.fromResult(result);
    } catch (error) {
      handleTenantError(error);
    }
  }

  /** Tenant picker: "which tenants can I access" before any tenant is selected. */
  @Get()
  async listMine(@CurrentAuth() auth: AuthContext): Promise<MyTenantSummary[]> {
    return this.listMyTenants.execute(auth.user.id);
  }

  /**
   * Demonstrates the full auth -> tenant-context chain other tenant-scoped
   * controllers should follow: `@UseGuards(SessionAuthGuard, TenantContextGuard)`
   * plus the `X-Tenant-Slug` header (docs/MULTITENANCY.md §6.1).
   */
  @Get("current")
  @UseGuards(TenantContextGuard)
  current(@CurrentTenantContext() tenantContext: TenantExecutionContext): {
    tenantId: string;
    membershipId: string;
    companyId?: string;
  } {
    return {
      tenantId: tenantContext.tenantId,
      membershipId: tenantContext.membershipId,
      companyId: tenantContext.companyId,
    };
  }
}
