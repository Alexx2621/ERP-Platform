import type { SettingDefinition } from "../../domain/setting-definition.entity";
import type { SettingValue } from "../../domain/setting-value.entity";
import type { EffectiveSetting } from "../../application/use-cases/get-effective-setting.use-case";
import type { UserPreference } from "../../domain/user-preference.entity";

export class SettingDefinitionResponseDto {
  key!: string;
  dataType!: string;
  description!: string;
  defaultValue!: unknown;
  allowedScopes!: string[];

  static fromDomain(definition: SettingDefinition): SettingDefinitionResponseDto {
    const dto = new SettingDefinitionResponseDto();
    dto.key = definition.key;
    dto.dataType = definition.dataType;
    dto.description = definition.description;
    dto.defaultValue = definition.defaultValue;
    dto.allowedScopes = [...definition.allowedScopes];
    return dto;
  }
}

export class EffectiveSettingResponseDto {
  key!: string;
  value!: unknown;
  source!: string;

  static fromDomain(setting: EffectiveSetting): EffectiveSettingResponseDto {
    const dto = new EffectiveSettingResponseDto();
    dto.key = setting.key;
    dto.value = setting.value;
    dto.source = setting.source;
    return dto;
  }
}

export class SettingValueResponseDto {
  key!: string;
  scopeType!: string;
  companyId!: string | null;
  value!: unknown;
  updatedAt!: string;

  static fromDomain(key: string, value: SettingValue): SettingValueResponseDto {
    const dto = new SettingValueResponseDto();
    dto.key = key;
    dto.scopeType = value.scopeType;
    dto.companyId = value.companyId;
    dto.value = value.value;
    dto.updatedAt = value.updatedAt.toISOString();
    return dto;
  }
}

export class UserPreferenceResponseDto {
  key!: string;
  value!: unknown;
  updatedAt!: string;

  static fromDomain(preference: UserPreference): UserPreferenceResponseDto {
    const dto = new UserPreferenceResponseDto();
    dto.key = preference.key;
    dto.value = preference.value;
    dto.updatedAt = preference.updatedAt.toISOString();
    return dto;
  }
}
