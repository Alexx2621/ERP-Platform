import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { newId } from "@erp/database";
import { SettingDefinition } from "../domain/setting-definition.entity";
import {
  SETTING_DEFINITION_REPOSITORY,
  SettingDefinitionRepository,
} from "../domain/setting-definition.repository";
import { FOUNDATION_SETTINGS } from "./setting-catalog";

/** Upserts the code-owned catalog into the database on every boot. Safe to run repeatedly — never deletes existing keys. */
@Injectable()
export class SettingCatalogSeeder implements OnModuleInit {
  private readonly logger = new Logger(SettingCatalogSeeder.name);

  constructor(
    @Inject(SETTING_DEFINITION_REPOSITORY) private readonly definitions: SettingDefinitionRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const now = new Date();
    for (const seed of FOUNDATION_SETTINGS) {
      await this.definitions.upsert(
        SettingDefinition.create({
          id: newId(),
          key: seed.key,
          dataType: seed.dataType,
          description: seed.description,
          defaultValue: seed.defaultValue,
          allowedScopes: seed.allowedScopes,
          createdAt: now,
        }),
      );
    }
    this.logger.log(`Setting catalog seeded (${FOUNDATION_SETTINGS.length} definitions).`);
  }
}
