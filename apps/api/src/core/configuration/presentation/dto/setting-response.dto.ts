import { ApiProperty } from "@nestjs/swagger";
import type { SettingDefinition } from "../../domain/setting-definition.entity";
import type { SettingValue } from "../../domain/setting-value.entity";
import type { EffectiveSetting } from "../../application/use-cases/get-effective-setting.use-case";
import type { UserPreference } from "../../domain/user-preference.entity";

export class SettingDefinitionResponseDto {
  @ApiProperty({ example: "localization.currency" }) key!: string;
  @ApiProperty({ enum: ["STRING", "NUMBER", "BOOLEAN", "JSON"] }) dataType!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ type: Object }) defaultValue!: unknown;
  @ApiProperty({ type: [String], enum: ["PLATFORM", "TENANT", "COMPANY"], isArray: true }) allowedScopes!: string[];

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
  @ApiProperty() key!: string;
  @ApiProperty({ type: Object }) value!: unknown;
  @ApiProperty({ enum: ["PLATFORM", "TENANT", "COMPANY", "DEFAULT"], description: "Which scope the effective value came from." })
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
  @ApiProperty() key!: string;
  @ApiProperty({ enum: ["TENANT", "COMPANY"] }) scopeType!: string;
  @ApiProperty({ type: String, nullable: true }) companyId!: string | null;
  @ApiProperty({ type: Object }) value!: unknown;
  @ApiProperty({ format: "date-time" }) updatedAt!: string;

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
  @ApiProperty() key!: string;
  @ApiProperty({ type: Object }) value!: unknown;
  @ApiProperty({ format: "date-time" }) updatedAt!: string;

  static fromDomain(preference: UserPreference): UserPreferenceResponseDto {
    const dto = new UserPreferenceResponseDto();
    dto.key = preference.key;
    dto.value = preference.value;
    dto.updatedAt = preference.updatedAt.toISOString();
    return dto;
  }
}
