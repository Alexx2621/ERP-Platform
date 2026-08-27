import { Module } from "@nestjs/common";
import { CompaniesModule } from "../companies";
import { UsersModule } from "../users";
import { AuthModule } from "../auth";
import { AccessControlModule } from "../access-control";
import { ProvisionTenantUseCase } from "./application/provision-tenant.use-case";
import { ResolveTenantContextUseCase } from "./application/resolve-tenant-context.use-case";
import { ListMyTenantsUseCase } from "./application/list-my-tenants.use-case";
import { TENANT_PROVISIONING_REPOSITORY } from "./application/ports/tenant-provisioning.repository";
import { MEMBERSHIP_REPOSITORY } from "./domain/membership.repository";
import { TENANT_REPOSITORY } from "./domain/tenant.repository";
import { PrismaMembershipRepository } from "./infrastructure/prisma-membership.repository";
import { PrismaTenantProvisioningRepository } from "./infrastructure/prisma-tenant-provisioning.repository";
import { PrismaTenantRepository } from "./infrastructure/prisma-tenant.repository";
import { TenantsController } from "./presentation/tenants.controller";
import { RolesController } from "./presentation/roles.controller";
import { TenantContextGuard } from "./presentation/tenant-context.guard";

// AccessControlModule has zero dependency on Tenants (see its own
// docstring), so importing it here — for SeedOwnerRoleUseCase at
// provisioning, and for RolesController's use-case/guard dependencies —
// does not create a module cycle. RolesController itself is declared in
// ./presentation/roles.controller.ts (not access-control/) precisely to
// avoid a module-loading cycle at the file-import level — see its docstring.
@Module({
  imports: [UsersModule, CompaniesModule, AuthModule, AccessControlModule],
  controllers: [TenantsController, RolesController],
  providers: [
    { provide: TENANT_REPOSITORY, useClass: PrismaTenantRepository },
    { provide: MEMBERSHIP_REPOSITORY, useClass: PrismaMembershipRepository },
    {
      provide: TENANT_PROVISIONING_REPOSITORY,
      useClass: PrismaTenantProvisioningRepository,
    },
    ProvisionTenantUseCase,
    ResolveTenantContextUseCase,
    ListMyTenantsUseCase,
    TenantContextGuard,
  ],
  exports: [
    TENANT_REPOSITORY,
    MEMBERSHIP_REPOSITORY,
    ProvisionTenantUseCase,
    ResolveTenantContextUseCase,
    ListMyTenantsUseCase,
    TenantContextGuard,
  ],
})
export class TenantsModule {}
