import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { newId } from "@erp/database";
import { AppDefinition } from "../domain/app-definition.entity";
import { APP_DEFINITION_REPOSITORY, AppDefinitionRepository } from "../domain/app-definition.repository";
import { FOUNDATION_APPS, validateAppCatalog } from "./app-catalog";

/**
 * Validates then upserts the code-owned catalog into the database on every
 * boot — same pattern as PermissionCatalogSeeder/SettingCatalogSeeder.
 * Never deletes existing keys (an app removed from FOUNDATION_APPS stays
 * in the table, still enable-able by whatever tenants already installed
 * it, until a real removal policy is designed — docs/PLUGINS.md §7.4 has
 * no destructive uninstall in V1 either).
 */
@Injectable()
export class AppCatalogSeeder implements OnModuleInit {
  private readonly logger = new Logger(AppCatalogSeeder.name);

  constructor(@Inject(APP_DEFINITION_REPOSITORY) private readonly definitions: AppDefinitionRepository) {}

  async onModuleInit(): Promise<void> {
    await this.seed();
  }

  /**
   * Exposed so `TenantAppEnablementSyncSeeder` can await it explicitly
   * before backfilling tenant enablement — same "don't rely on same-module
   * onModuleInit ordering" lesson `OwnerRolePermissionSyncSeeder` already
   * applied to `PermissionCatalogSeeder`. Idempotent: calling it twice on
   * the same boot is harmless.
   */
  async seed(): Promise<void> {
    validateAppCatalog(FOUNDATION_APPS);

    const now = new Date();
    for (const manifest of FOUNDATION_APPS) {
      await this.definitions.upsert(
        AppDefinition.create({
          id: newId(),
          key: manifest.key,
          name: manifest.name,
          version: manifest.version,
          kind: manifest.kind,
          dependsOnKeys: manifest.dependsOnKeys,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
    this.logger.log(`App catalog seeded (${FOUNDATION_APPS.length} definitions).`);
  }
}
