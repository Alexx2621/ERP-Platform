/** Public contract of the App Registry module. Other modules must only import from here. */
export { AppDefinition, type AppDefinitionProps, type AppKind } from "./domain/app-definition.entity";
export { TenantApp, type TenantAppProps, type TenantAppStatus } from "./domain/tenant-app.entity";
export { AppConfiguration, type AppConfigurationProps } from "./domain/app-configuration.entity";
export { FOUNDATION_APPS, type AppManifest, validateAppCatalog, InvalidAppCatalogError } from "./application/app-catalog";
export { ListAppDefinitionsUseCase } from "./application/use-cases/list-app-definitions.use-case";
export {
  ListTenantAppsUseCase,
  type TenantAppSummary,
} from "./application/use-cases/list-tenant-apps.use-case";
export { EnableAppUseCase, type EnableAppInput } from "./application/use-cases/enable-app.use-case";
export { DisableAppUseCase, type DisableAppInput } from "./application/use-cases/disable-app.use-case";
export { EnableAllCatalogAppsUseCase } from "./application/use-cases/enable-all-catalog-apps.use-case";
export {
  IsAppEnabledForTenantUseCase,
  type IsAppEnabledForTenantInput,
} from "./application/use-cases/is-app-enabled-for-tenant.use-case";
export {
  ListAppConfigurationUseCase,
  type ListAppConfigurationInput,
} from "./application/use-cases/list-app-configuration.use-case";
export {
  SetAppConfigurationUseCase,
  type SetAppConfigurationInput,
} from "./application/use-cases/set-app-configuration.use-case";
export { AppCatalogSeeder } from "./application/app-catalog-seeder";
export {
  AppNotFoundError,
  AppDependencyNotSatisfiedError,
  AppHasActiveDependentsError,
  AppNotEnabledError,
} from "./application/errors";
export { handleAppRegistryError } from "./presentation/app-registry-error.mapper";
export { AppEnablementGuard } from "./presentation/app-enablement.guard";
export { RequireApp, APP_METADATA_KEY } from "./presentation/require-app.decorator";
export { SetAppConfigurationDto } from "./presentation/dto/set-app-configuration.dto";
export {
  AppDefinitionResponseDto,
  TenantAppResponseDto,
  AppConfigurationResponseDto,
} from "./presentation/dto/app-response.dto";
export { AppRegistryModule } from "./app-registry.module";
