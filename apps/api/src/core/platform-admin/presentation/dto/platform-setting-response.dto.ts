import { ApiProperty } from "@nestjs/swagger";
import type { EffectiveSetting, SettingValue } from "../../../configuration";

export class PlatformSettingResponseDto {
  @ApiProperty({ example: "localization.currency" }) key!: string;
  @ApiProperty({ type: Object }) value!: unknown;
  @ApiProperty({ enum: ["PLATFORM", "DEFAULT"], description: "PLATFORM if an override exists, DEFAULT otherwise." })
  source!: string;

  static fromEffective(setting: EffectiveSetting): PlatformSettingResponseDto {
    const dto = new PlatformSettingResponseDto();
    dto.key = setting.key;
    dto.value = setting.value;
    dto.source = setting.source;
    return dto;
  }
}

export class PlatformSettingValueResponseDto {
  @ApiProperty() key!: string;
  @ApiProperty({ type: Object }) value!: unknown;
  @ApiProperty({ format: "date-time" }) updatedAt!: string;

  static fromDomain(key: string, value: SettingValue): PlatformSettingValueResponseDto {
    const dto = new PlatformSettingValueResponseDto();
    dto.key = key;
    dto.value = value.value;
    dto.updatedAt = value.updatedAt.toISOString();
    return dto;
  }
}
