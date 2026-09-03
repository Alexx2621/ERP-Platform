import { Module } from "@nestjs/common";
import { APP_DEFINITION_REPOSITORY } from "./domain/app-definition.repository";
import { TENANT_APP_REPOSITORY } from "./domain/tenant-app.repository";
import { APP_CONFIGURATION_REPOSITORY } from "./domain/app-configuration.repository";
import { PrismaAppDefinitionRepository } from "./infrastructure/prisma-app-definition.repository";
import { PrismaTenantAppRepository } from "./infrastructure/prisma-tenant-app.repository";
import { PrismaAppConfigurationRepository } from "./infrastructure/prisma-app-configuration.repository";
import { AppCatalogSeeder } from "./application/app-catalog-seeder";
import { ListAppDefinitionsUseCase } from "./application/use-cases/list-app-definitions.use-case";
import { ListTenantAppsUseCase } from "./application/use-cases/list-tenant-apps.use-case";
import { EnableAppUseCase } from "./application/use-cases/enable-app.use-case";
import { DisableAppUseCase } from "./application/use-cases/disable-app.use-case";
import { EnableAllCatalogAppsUseCase } from "./application/use-cases/enable-all-catalog-apps.use-case";
import { IsAppEnabledForTenantUseCase } from "./application/use-cases/is-app-enabled-for-tenant.use-case";
import { ListAppConfigurationUseCase } from "./application/use-cases/list-app-configuration.use-case";
import { SetAppConfigurationUseCase } from "./application/use-cases/set-app-configuration.use-case";
import { AppEnablementGuard } from "./presentation/app-enablement.guard";

/**
 * A deliberate leaf module since docs/DECISIONS.md ADR-015 — zero imports
 * of Auth/Tenants/AccessControl/Audit or any other Core module. Before
 * ADR-015 it imported all four purely for `AppsController` (moved to
 * `tenants/presentation/apps.controller.ts` — see that file's docstring
 * for why). Staying leaf here is now load-bearing, not incidental: every
 * one of the 15 business modules (Catalog, Sales, Inventory, ...) needs to
 * import `AppRegistryModule` for `AppEnablementGuard`, and none of them
 * can risk a module-loading cycle back into this one.
 */
@Module({
  imports: [],
  controllers: [],
  providers: [
    { provide: APP_DEFINITION_REPOSITORY, useClass: PrismaAppDefinitionRepository },
    { provide: TENANT_APP_REPOSITORY, useClass: PrismaTenantAppRepository },
    { provide: APP_CONFIGURATION_REPOSITORY, useClass: PrismaAppConfigurationRepository },
    AppCatalogSeeder,
    ListAppDefinitionsUseCase,
    ListTenantAppsUseCase,
    EnableAppUseCase,
    DisableAppUseCase,
    EnableAllCatalogAppsUseCase,
    IsAppEnabledForTenantUseCase,
    ListAppConfigurationUseCase,
    SetAppConfigurationUseCase,
    AppEnablementGuard,
  ],
  exports: [
    ListAppDefinitionsUseCase,
    ListTenantAppsUseCase,
    EnableAppUseCase,
    DisableAppUseCase,
    EnableAllCatalogAppsUseCase,
    IsAppEnabledForTenantUseCase,
    ListAppConfigurationUseCase,
    SetAppConfigurationUseCase,
    AppCatalogSeeder,
    AppEnablementGuard,
  ],
})
export class AppRegistryModule {}
