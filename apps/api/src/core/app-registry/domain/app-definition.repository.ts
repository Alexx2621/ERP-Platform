import { AppDefinition } from "./app-definition.entity";

export interface AppDefinitionRepository {
  findByKey(key: string): Promise<AppDefinition | null>;
  findAll(): Promise<AppDefinition[]>;
  /** Idempotent by `key` — used only by AppCatalogSeeder, never by request handlers. */
  upsert(definition: AppDefinition): Promise<void>;
}

export const APP_DEFINITION_REPOSITORY = Symbol("APP_DEFINITION_REPOSITORY");
