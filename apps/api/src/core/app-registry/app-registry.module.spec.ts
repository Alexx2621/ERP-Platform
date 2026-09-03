import { Global, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { AppRegistryModule } from "./app-registry.module";
import { ListAppDefinitionsUseCase } from "./application/use-cases/list-app-definitions.use-case";
import { ListTenantAppsUseCase } from "./application/use-cases/list-tenant-apps.use-case";
import { EnableAppUseCase } from "./application/use-cases/enable-app.use-case";
import { DisableAppUseCase } from "./application/use-cases/disable-app.use-case";
import { EnableAllCatalogAppsUseCase } from "./application/use-cases/enable-all-catalog-apps.use-case";
import { IsAppEnabledForTenantUseCase } from "./application/use-cases/is-app-enabled-for-tenant.use-case";
import { AppCatalogSeeder } from "./application/app-catalog-seeder";
import { AppEnablementGuard } from "./presentation/app-enablement.guard";

// AppRegistryModule is a deliberate leaf since docs/DECISIONS.md ADR-015 —
// it needs nothing but Prisma, unlike before when it also needed Auth/
// Tenants/AccessControl for AppsController (now moved to
// tenants/presentation/apps.controller.ts, covered by tenants.module.spec.ts
// instead). Same StubInfraModule pattern as every other module.spec.ts.
@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: {} }],
  exports: [PrismaService],
})
class StubInfraModule {}

describe("AppRegistryModule wiring", () => {
  it("resolves every exported use case and the enablement guard, with no dependency on any other Core module", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [StubInfraModule, AppRegistryModule],
    }).compile();

    expect(moduleRef.get(ListAppDefinitionsUseCase)).toBeInstanceOf(ListAppDefinitionsUseCase);
    expect(moduleRef.get(ListTenantAppsUseCase)).toBeInstanceOf(ListTenantAppsUseCase);
    expect(moduleRef.get(EnableAppUseCase)).toBeInstanceOf(EnableAppUseCase);
    expect(moduleRef.get(DisableAppUseCase)).toBeInstanceOf(DisableAppUseCase);
    expect(moduleRef.get(EnableAllCatalogAppsUseCase)).toBeInstanceOf(EnableAllCatalogAppsUseCase);
    expect(moduleRef.get(IsAppEnabledForTenantUseCase)).toBeInstanceOf(IsAppEnabledForTenantUseCase);
    expect(moduleRef.get(AppCatalogSeeder)).toBeInstanceOf(AppCatalogSeeder);
    expect(moduleRef.get(AppEnablementGuard)).toBeInstanceOf(AppEnablementGuard);

    await moduleRef.close();
  });
});
