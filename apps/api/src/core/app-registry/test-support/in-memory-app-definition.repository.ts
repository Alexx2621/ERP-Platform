import { AppDefinition } from "../domain/app-definition.entity";
import { AppDefinitionRepository } from "../domain/app-definition.repository";

export class InMemoryAppDefinitionRepository implements AppDefinitionRepository {
  private readonly byKey = new Map<string, AppDefinition>();

  async findByKey(key: string): Promise<AppDefinition | null> {
    return this.byKey.get(key) ?? null;
  }

  async findAll(): Promise<AppDefinition[]> {
    return [...this.byKey.values()];
  }

  async upsert(definition: AppDefinition): Promise<void> {
    this.byKey.set(definition.key, definition);
  }
}
