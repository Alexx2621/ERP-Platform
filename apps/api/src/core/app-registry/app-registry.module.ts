import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { TenantsModule } from "../tenants";
import { AccessControlModule } from "../access-control";
import { AuditModule } from "../audit";
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
import { ListAppConfigurationUseCase } from "./application/use-cases/list-app-configuration.use-case";
import { SetAppConfigurationUseCase } from "./application/use-cases/set-app-configuration.use-case";
import { AppsController } from "./presentation/apps.controller";

/**
 * Nothing depends on App Registry, so — like Configuration/Files — there is
 * no module-loading cycle risk here: AppsController can safely import
 * TenantContextGuard/CurrentTenantContext from Tenants and PermissionGuard/
 * RequirePermission from Access Control directly, and live physically in
 * this module's own presentation/ folder.
 */
@Module({
  imports: [AuthModule, TenantsModule, AccessControlModule, AuditModule],
  controllers: [AppsController],
  providers: [
    { provide: APP_DEFINITION_REPOSITORY, useClass: PrismaAppDefinitionRepository },
    { provide: TENANT_APP_REPOSITORY, useClass: PrismaTenantAppRepository },
    { provide: APP_CONFIGURATION_REPOSITORY, useClass: PrismaAppConfigurationRepository },
    AppCatalogSeeder,
    ListAppDefinitionsUseCase,
    ListTenantAppsUseCase,
    EnableAppUseCase,
    DisableAppUseCase,
    ListAppConfigurationUseCase,
    SetAppConfigurationUseCase,
  ],
  exports: [
    ListAppDefinitionsUseCase,
    ListTenantAppsUseCase,
    EnableAppUseCase,
    DisableAppUseCase,
    ListAppConfigurationUseCase,
    SetAppConfigurationUseCase,
  ],
})
export class AppRegistryModule {}
