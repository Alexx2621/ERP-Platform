import type { ConfigScopeType } from "./setting-definition.entity";
import type { SettingValue } from "./setting-value.entity";

export const SETTING_VALUE_REPOSITORY = Symbol("SETTING_VALUE_REPOSITORY");

export interface SettingValueRepository {
  findByScope(
    definitionId: string,
    scopeType: ConfigScopeType,
    scopeKey: string,
  ): Promise<SettingValue | null>;
  /** Every stored value for a definition across TENANT/COMPANY scopes within one tenant — used to render an effective-settings view. */
  findByDefinitionAndTenant(definitionId: string, tenantId: string): Promise<SettingValue[]>;
  save(value: SettingValue): Promise<void>;
}
