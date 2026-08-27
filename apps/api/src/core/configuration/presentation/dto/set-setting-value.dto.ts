import { IsDefined, IsIn, IsString, MinLength, ValidateIf } from "class-validator";
import type { ConfigScopeType } from "../../domain/setting-definition.entity";

/**
 * `scopeType` intentionally only accepts TENANT/COMPANY — see
 * SettingsController's docstring for why PLATFORM writes are not exposed by
 * this endpoint.
 */
export class SetSettingValueDto {
  @IsIn(["TENANT", "COMPANY"])
  scopeType!: Exclude<ConfigScopeType, "PLATFORM">;

  @ValidateIf((dto: SetSettingValueDto) => dto.scopeType === "COMPANY")
  @IsString()
  @MinLength(1)
  companyId?: string;

  @IsDefined()
  value!: unknown;
}
