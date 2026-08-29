import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { TenantsModule } from "../tenants";
import { AccessControlModule } from "../access-control";
import { AuditModule } from "../audit";
import { SETTING_DEFINITION_REPOSITORY } from "./domain/setting-definition.repository";
import { SETTING_VALUE_REPOSITORY } from "./domain/setting-value.repository";
import { USER_PREFERENCE_REPOSITORY } from "./domain/user-preference.repository";
import { PrismaSettingDefinitionRepository } from "./infrastructure/prisma-setting-definition.repository";
import { PrismaSettingValueRepository } from "./infrastructure/prisma-setting-value.repository";
import { PrismaUserPreferenceRepository } from "./infrastructure/prisma-user-preference.repository";
import { SettingCatalogSeeder } from "./application/setting-catalog-seeder";
import { ListSettingDefinitionsUseCase } from "./application/use-cases/list-setting-definitions.use-case";
import { GetEffectiveSettingUseCase } from "./application/use-cases/get-effective-setting.use-case";
import { ListEffectiveSettingsUseCase } from "./application/use-cases/list-effective-settings.use-case";
import { ListPlatformSettingsUseCase } from "./application/use-cases/list-platform-settings.use-case";
import { SetSettingValueUseCase } from "./application/use-cases/set-setting-value.use-case";
import { GetUserPreferenceUseCase } from "./application/use-cases/get-user-preference.use-case";
import { ListUserPreferencesUseCase } from "./application/use-cases/list-user-preferences.use-case";
import { SetUserPreferenceUseCase } from "./application/use-cases/set-user-preference.use-case";
import { SettingsController } from "./presentation/settings.controller";
import { PreferencesController } from "./presentation/preferences.controller";

/**
 * Nothing depends on Configuration, so — unlike Access Control/Tenants —
 * there is no module-loading cycle risk here: SettingsController can safely
 * import TenantContextGuard/CurrentTenantContext from Tenants and
 * PermissionGuard/RequirePermission from Access Control directly, and live
 * physically in this module's own presentation/ folder.
 */
@Module({
  imports: [AuthModule, TenantsModule, AccessControlModule, AuditModule],
  controllers: [SettingsController, PreferencesController],
  providers: [
    { provide: SETTING_DEFINITION_REPOSITORY, useClass: PrismaSettingDefinitionRepository },
    { provide: SETTING_VALUE_REPOSITORY, useClass: PrismaSettingValueRepository },
    { provide: USER_PREFERENCE_REPOSITORY, useClass: PrismaUserPreferenceRepository },
    SettingCatalogSeeder,
    ListSettingDefinitionsUseCase,
    GetEffectiveSettingUseCase,
    ListEffectiveSettingsUseCase,
    ListPlatformSettingsUseCase,
    SetSettingValueUseCase,
    GetUserPreferenceUseCase,
    ListUserPreferencesUseCase,
    SetUserPreferenceUseCase,
  ],
  exports: [
    ListSettingDefinitionsUseCase,
    GetEffectiveSettingUseCase,
    ListEffectiveSettingsUseCase,
    ListPlatformSettingsUseCase,
    SetSettingValueUseCase,
    GetUserPreferenceUseCase,
    ListUserPreferencesUseCase,
    SetUserPreferenceUseCase,
  ],
})
export class ConfigurationModule {}
