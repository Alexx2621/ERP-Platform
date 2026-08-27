import { Test } from "@nestjs/testing";
import { AppModule } from "./app.module";
import { PrismaService } from "./shared/prisma/prisma.service";
import { RedisService } from "./shared/redis/redis.service";
import { AuthController } from "./core/auth/presentation/auth.controller";
import {
  ListMyTenantsUseCase,
  ProvisionTenantUseCase,
  ResolveTenantContextUseCase,
  TenantContextGuard,
  RolesController,
  AuditEntriesController,
} from "./core/tenants";
import { RecordAuditEntryUseCase, ListAuditEntriesUseCase } from "./core/audit";
import { TenantsController } from "./core/tenants/presentation/tenants.controller";
import { CreateOrganizationUseCase } from "./core/organizations";
import { CreateCompanyUseCase } from "./core/companies";
import {
  CreateRoleUseCase,
  AssignRoleUseCase,
  HasPermissionUseCase,
  PermissionGuard,
} from "./core/access-control";
import { GetEffectiveSettingUseCase, SetSettingValueUseCase } from "./core/configuration";
import { SettingsController } from "./core/configuration/presentation/settings.controller";
import { PreferencesController } from "./core/configuration/presentation/preferences.controller";
import { DomainEventBus, DispatchOutboxBatchUseCase } from "./core/events";

/**
 * Boots the real AppModule graph (Auth + Users + Tenants + Organizations +
 * Companies) with only PrismaService stubbed out, so a broken import, a
 * missing provider, or a circular dependency between core modules fails here
 * instead of only being discoverable at real server startup. This is the
 * check that would have caught TenantsModule never being wired into
 * AppModule (docs/PROJECT_STATE.md — fixed 2026-08-26).
 */
describe("AppModule wiring", () => {
  it("compiles the full module graph with every cross-module use case resolvable", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(RedisService)
      .useValue({})
      .compile();

    expect(moduleRef.get(AuthController)).toBeInstanceOf(AuthController);
    expect(moduleRef.get(TenantsController)).toBeInstanceOf(TenantsController);
    expect(moduleRef.get(ProvisionTenantUseCase)).toBeInstanceOf(ProvisionTenantUseCase);
    expect(moduleRef.get(ResolveTenantContextUseCase)).toBeInstanceOf(ResolveTenantContextUseCase);
    expect(moduleRef.get(ListMyTenantsUseCase)).toBeInstanceOf(ListMyTenantsUseCase);
    expect(moduleRef.get(TenantContextGuard)).toBeInstanceOf(TenantContextGuard);
    expect(moduleRef.get(CreateOrganizationUseCase)).toBeInstanceOf(CreateOrganizationUseCase);
    expect(moduleRef.get(CreateCompanyUseCase)).toBeInstanceOf(CreateCompanyUseCase);
    expect(moduleRef.get(RolesController)).toBeInstanceOf(RolesController);
    expect(moduleRef.get(CreateRoleUseCase)).toBeInstanceOf(CreateRoleUseCase);
    expect(moduleRef.get(AssignRoleUseCase)).toBeInstanceOf(AssignRoleUseCase);
    expect(moduleRef.get(HasPermissionUseCase)).toBeInstanceOf(HasPermissionUseCase);
    expect(moduleRef.get(PermissionGuard)).toBeInstanceOf(PermissionGuard);
    expect(moduleRef.get(GetEffectiveSettingUseCase)).toBeInstanceOf(GetEffectiveSettingUseCase);
    expect(moduleRef.get(SetSettingValueUseCase)).toBeInstanceOf(SetSettingValueUseCase);
    expect(moduleRef.get(SettingsController)).toBeInstanceOf(SettingsController);
    expect(moduleRef.get(PreferencesController)).toBeInstanceOf(PreferencesController);
    expect(moduleRef.get(RecordAuditEntryUseCase)).toBeInstanceOf(RecordAuditEntryUseCase);
    expect(moduleRef.get(ListAuditEntriesUseCase)).toBeInstanceOf(ListAuditEntriesUseCase);
    expect(moduleRef.get(AuditEntriesController)).toBeInstanceOf(AuditEntriesController);
    expect(moduleRef.get(DomainEventBus)).toBeInstanceOf(DomainEventBus);
    expect(moduleRef.get(DispatchOutboxBatchUseCase)).toBeInstanceOf(DispatchOutboxBatchUseCase);

    await moduleRef.close();
  });
});
