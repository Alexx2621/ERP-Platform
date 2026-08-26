import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { CurrentAuth, type AuthContext, SessionAuthGuard } from "../../auth";
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
  ) {}

  /** Onboarding: "create tenant" step of MASTER_SPEC §68's "crear cuenta → crear empresa" flow. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async provision(
    @Body() dto: ProvisionTenantDto,
    @CurrentAuth() auth: AuthContext,
  ): Promise<ProvisionedTenantResponseDto> {
    try {
      const result = await this.provisionTenant.execute({
        slug: dto.slug,
        name: dto.name,
        ownerUserId: auth.user.id,
        organization: dto.organization,
        company: dto.company,
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
