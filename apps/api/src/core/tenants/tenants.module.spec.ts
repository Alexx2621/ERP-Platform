import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { ProvisionTenantUseCase } from "./application/provision-tenant.use-case";
import { ResolveTenantContextUseCase } from "./application/resolve-tenant-context.use-case";
import { ListMyTenantsUseCase } from "./application/list-my-tenants.use-case";
import { InviteMembershipUseCase } from "./application/invite-membership.use-case";
import { AcceptMembershipInvitationUseCase } from "./application/accept-membership-invitation.use-case";
import { ListMembershipsUseCase } from "./application/list-memberships.use-case";
import { ListPendingInvitationsUseCase } from "./application/list-pending-invitations.use-case";
import { TenantContextGuard } from "./presentation/tenant-context.guard";
import { TenantsController } from "./presentation/tenants.controller";
import { RolesController } from "./presentation/roles.controller";
import { AuditEntriesController } from "./presentation/audit-entries.controller";
import { NotificationsController } from "./presentation/notifications.controller";
import { MembershipsController } from "./presentation/memberships.controller";
import { TenantsModule } from "./tenants.module";
import { SeedOwnerRoleUseCase } from "../access-control";
import { RecordAuditEntryUseCase, ListAuditEntriesUseCase } from "../audit";
import {
  RequestNotificationUseCase,
  ListNotificationsUseCase,
  MarkNotificationReadUseCase,
} from "../notifications";

// TenantsModule now imports AuthModule (for SessionAuthGuard on TenantsController),
// which in turn needs Redis for its throttler storage — see auth.module.spec.ts
// for why these have to be @Global() stub modules rather than plain providers.
@Global()
@Module({
  providers: [
    { provide: PrismaService, useValue: {} },
    { provide: RedisService, useValue: {} },
    { provide: NOTIFICATIONS_PRISMA_CLIENT, useExisting: PrismaService },
  ],
  exports: [PrismaService, RedisService, NOTIFICATIONS_PRISMA_CLIENT],
})
class StubInfraModule {}

describe("TenantsModule wiring", () => {
  it("resolves provisioning, tenant-context and HTTP-layer providers", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              LOGIN_RATE_LIMIT_MAX: 5,
              LOGIN_RATE_LIMIT_WINDOW_SECONDS: 60,
              ACCESS_TOKEN_TTL_SECONDS: 900,
              REFRESH_TOKEN_TTL_SECONDS: 2_592_000,
            }),
          ],
        }),
        StubInfraModule,
        TenantsModule,
      ],
    }).compile();

    expect(moduleRef.get(ProvisionTenantUseCase)).toBeInstanceOf(ProvisionTenantUseCase);
    expect(moduleRef.get(ResolveTenantContextUseCase)).toBeInstanceOf(ResolveTenantContextUseCase);
    expect(moduleRef.get(ListMyTenantsUseCase)).toBeInstanceOf(ListMyTenantsUseCase);
    expect(moduleRef.get(TenantContextGuard)).toBeInstanceOf(TenantContextGuard);
    expect(moduleRef.get(TenantsController)).toBeInstanceOf(TenantsController);
    expect(moduleRef.get(SeedOwnerRoleUseCase)).toBeInstanceOf(SeedOwnerRoleUseCase);
    expect(moduleRef.get(RolesController)).toBeInstanceOf(RolesController);
    expect(moduleRef.get(RecordAuditEntryUseCase)).toBeInstanceOf(RecordAuditEntryUseCase);
    expect(moduleRef.get(ListAuditEntriesUseCase)).toBeInstanceOf(ListAuditEntriesUseCase);
    expect(moduleRef.get(AuditEntriesController)).toBeInstanceOf(AuditEntriesController);
    expect(moduleRef.get(RequestNotificationUseCase)).toBeInstanceOf(RequestNotificationUseCase);
    expect(moduleRef.get(ListNotificationsUseCase)).toBeInstanceOf(ListNotificationsUseCase);
    expect(moduleRef.get(MarkNotificationReadUseCase)).toBeInstanceOf(MarkNotificationReadUseCase);
    expect(moduleRef.get(NotificationsController)).toBeInstanceOf(NotificationsController);
    expect(moduleRef.get(InviteMembershipUseCase)).toBeInstanceOf(InviteMembershipUseCase);
    expect(moduleRef.get(AcceptMembershipInvitationUseCase)).toBeInstanceOf(AcceptMembershipInvitationUseCase);
    expect(moduleRef.get(ListMembershipsUseCase)).toBeInstanceOf(ListMembershipsUseCase);
    expect(moduleRef.get(ListPendingInvitationsUseCase)).toBeInstanceOf(ListPendingInvitationsUseCase);
    expect(moduleRef.get(MembershipsController)).toBeInstanceOf(MembershipsController);

    await moduleRef.close();
  });
});
