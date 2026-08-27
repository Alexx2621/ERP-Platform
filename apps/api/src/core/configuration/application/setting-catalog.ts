import type { ConfigScopeType, SettingDataType } from "../domain/setting-definition.entity";

export interface SettingDefinitionSeed {
  key: string;
  dataType: SettingDataType;
  description: string;
  defaultValue: unknown;
  allowedScopes: ConfigScopeType[];
}

/**
 * Code-owned configuration catalog (docs/ARCHITECTURE.md §8.2, MASTER_SPEC
 * §28/§29 — moneda, zona horaria, idioma). Deliberately limited to the three
 * cross-cutting localization axes that belong to the Platform Core; settings
 * that belong to a specific business module (taxes, default warehouse, ...)
 * are added by that module once it exists, not speculated here.
 */
export const FOUNDATION_SETTINGS: readonly SettingDefinitionSeed[] = [
  {
    key: "localization.currency",
    dataType: "STRING",
    description: "ISO 4217 currency code used when no more specific scope overrides it.",
    defaultValue: "USD",
    allowedScopes: ["PLATFORM", "TENANT", "COMPANY"],
  },
  {
    key: "localization.timezone",
    dataType: "STRING",
    description: "IANA timezone identifier used to render UTC instants for a scope.",
    defaultValue: "UTC",
    allowedScopes: ["PLATFORM", "TENANT", "COMPANY"],
  },
  {
    key: "localization.locale",
    dataType: "STRING",
    description: "BCP 47 language tag used for UI text and formatting.",
    defaultValue: "en",
    allowedScopes: ["PLATFORM", "TENANT", "COMPANY"],
  },
];
