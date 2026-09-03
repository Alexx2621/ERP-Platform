import { Module } from "@nestjs/common";
import { CompaniesModule } from "../companies";
import { UsersModule } from "../users";
import { AuthModule } from "../auth";
import { AccessControlModule } from "../access-control";
import { AuditModule } from "../audit";
import { NotificationsModule } from "../notifications";
import { AppRegistryModule } from "../app-registry";
import { ProvisionTenantUseCase } from "./application/provision-tenant.use-case";
import { ResolveTenantContextUseCase } from "./application/resolve-tenant-context.use-case";
import { ListMyTenantsUseCase } from "./application/list-my-tenants.use-case";
import { InviteMembershipUseCase } from "./application/invite-membership.use-case";
import { AcceptMembershipInvitationUseCase } from "./application/accept-membership-invitation.use-case";
import { RevokeMembershipInvitationUseCase } from "./application/revoke-membership-invitation.use-case";
import { ListMembershipsUseCase } from "./application/list-memberships.use-case";
import { ListPendingInvitationsUseCase } from "./application/list-pending-invitations.use-case";
import { TenantAppEnablementSyncSeeder } from "./application/tenant-app-enablement-sync-seeder";
import { TENANT_PROVISIONING_REPOSITORY } from "./application/ports/tenant-provisioning.repository";
import { MEMBERSHIP_REPOSITORY } from "./domain/membership.repository";
import { TENANT_REPOSITORY } from "./domain/tenant.repository";
import { PrismaMembershipRepository } from "./infrastructure/prisma-membership.repository";
import { PrismaTenantProvisioningRepository } from "./infrastructure/prisma-tenant-provisioning.repository";
import { PrismaTenantRepository } from "./infrastructure/prisma-tenant.repository";
import { TenantsController } from "./presentation/tenants.controller";
import { RolesController } from "./presentation/roles.controller";
import { AuditEntriesController } from "./presentation/audit-entries.controller";
import { NotificationsController } from "./presentation/notifications.controller";
import { MembershipsController } from "./presentation/memberships.controller";
import { AppsController } from "./presentation/apps.controller";
import { TenantContextGuard } from "./presentation/tenant-context.guard";

// AccessControlModule, AuditModule, NotificationsModule and (since
// docs/DECISIONS.md ADR-015) AppRegistryModule all have zero dependency on
// Tenants (see their own docstrings), so importing them here — for
// SeedOwnerRoleUseCase/RecordAuditEntryUseCase/RequestNotificationUseCase/
// EnableAllCatalogAppsUseCase at provisioning, and for RolesController's/
// AuditEntriesController's/NotificationsController's/AppsController's
// use-case/guard dependencies — does not create a module cycle. All four
// controllers are declared under ./presentation/ (not access-control/,
// audit/, notifications/ or app-registry/) precisely to avoid a
// module-loading cycle at the file-import level — see their docstrings.
@Module({
  imports: [
    UsersModule,
    CompaniesModule,
    AuthModule,
    AccessControlModule,
    AuditModule,
    NotificationsModule,
    AppRegistryModule,
  ],
  controllers: [
    TenantsController,
    RolesController,
    AuditEntriesController,
    NotificationsController,
    MembershipsController,
    AppsController,
  ],
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
    InviteMembershipUseCase,
    AcceptMembershipInvitationUseCase,
    RevokeMembershipInvitationUseCase,
    ListMembershipsUseCase,
    ListPendingInvitationsUseCase,
    TenantAppEnablementSyncSeeder,
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
