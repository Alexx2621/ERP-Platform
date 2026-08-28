import { ApiProperty } from "@nestjs/swagger";
import { IsDefined, IsIn, IsString, MinLength, ValidateIf } from "class-validator";
import type { ConfigScopeType } from "../../domain/setting-definition.entity";

/**
 * `scopeType` intentionally only accepts TENANT/COMPANY — see
 * SettingsController's docstring for why PLATFORM writes are not exposed by
 * this endpoint.
 */
export class SetSettingValueDto {
  @ApiProperty({ enum: ["TENANT", "COMPANY"], description: "PLATFORM writes are not exposed by this endpoint." })
  @IsIn(["TENANT", "COMPANY"])
  scopeType!: Exclude<ConfigScopeType, "PLATFORM">;

  @ApiProperty({ required: false, description: "Required when scopeType is COMPANY." })
  @ValidateIf((dto: SetSettingValueDto) => dto.scopeType === "COMPANY")
  @IsString()
  @MinLength(1)
  companyId?: string;

  @ApiProperty({ type: Object, description: "Must match the setting's declared data type." })
  @IsDefined()
  value!: unknown;
}
