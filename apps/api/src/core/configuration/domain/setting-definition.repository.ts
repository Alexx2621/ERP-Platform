import type { SettingDefinition } from "./setting-definition.entity";

export const SETTING_DEFINITION_REPOSITORY = Symbol("SETTING_DEFINITION_REPOSITORY");

export interface SettingDefinitionRepository {
  findByKey(key: string): Promise<SettingDefinition | null>;
  findAll(): Promise<SettingDefinition[]>;
  upsert(definition: SettingDefinition): Promise<void>;
}
