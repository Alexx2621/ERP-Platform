/** Public contract of the Configuration module. Other modules must only import from here. */
export {
  SettingDefinition,
  type SettingDefinitionProps,
  type ConfigScopeType,
  type SettingDataType,
} from "./domain/setting-definition.entity";
export { SettingValue, type SettingValueProps } from "./domain/setting-value.entity";
export { UserPreference, type UserPreferenceProps } from "./domain/user-preference.entity";
export { FOUNDATION_SETTINGS, type SettingDefinitionSeed } from "./application/setting-catalog";
export {
  ListSettingDefinitionsUseCase,
} from "./application/use-cases/list-setting-definitions.use-case";
export {
  GetEffectiveSettingUseCase,
  type GetEffectiveSettingInput,
  type EffectiveSetting,
  type EffectiveSettingSource,
} from "./application/use-cases/get-effective-setting.use-case";
export {
  ListEffectiveSettingsUseCase,
  type ListEffectiveSettingsInput,
} from "./application/use-cases/list-effective-settings.use-case";
export {
  SetSettingValueUseCase,
  type SetSettingValueInput,
} from "./application/use-cases/set-setting-value.use-case";
export {
  GetUserPreferenceUseCase,
  type GetUserPreferenceInput,
} from "./application/use-cases/get-user-preference.use-case";
export { ListUserPreferencesUseCase } from "./application/use-cases/list-user-preferences.use-case";
export {
  SetUserPreferenceUseCase,
  type SetUserPreferenceInput,
} from "./application/use-cases/set-user-preference.use-case";
export {
  SettingDefinitionNotFoundError,
  ScopeNotAllowedForSettingError,
  InvalidSettingValueError,
  CompanyContextRequiredError,
  CompanyNotFoundInTenantError,
} from "./application/errors";
export { ConfigurationModule } from "./configuration.module";
