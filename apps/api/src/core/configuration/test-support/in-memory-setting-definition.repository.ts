import { SettingDefinition } from "../domain/setting-definition.entity";
import { SettingDefinitionRepository } from "../domain/setting-definition.repository";

export class InMemorySettingDefinitionRepository implements SettingDefinitionRepository {
  private readonly byKey = new Map<string, SettingDefinition>();

  async findByKey(key: string): Promise<SettingDefinition | null> {
    return this.byKey.get(key) ?? null;
  }

  async findAll(): Promise<SettingDefinition[]> {
    return [...this.byKey.values()];
  }

  async upsert(definition: SettingDefinition): Promise<void> {
    this.byKey.set(definition.key, definition);
  }
}
