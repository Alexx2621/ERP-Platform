import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { newId } from "@erp/database";
import { Permission } from "../domain/permission.entity";
import { PERMISSION_REPOSITORY, PermissionRepository } from "../domain/permission.repository";
import { FOUNDATION_PERMISSIONS } from "./permission-catalog";

/** Upserts the code-owned catalog into the database on every boot. Safe to run repeatedly — never deletes existing keys. */
@Injectable()
export class PermissionCatalogSeeder implements OnModuleInit {
  private readonly logger = new Logger(PermissionCatalogSeeder.name);

  constructor(@Inject(PERMISSION_REPOSITORY) private readonly permissions: PermissionRepository) {}

  async onModuleInit(): Promise<void> {
    const now = new Date();
    for (const definition of FOUNDATION_PERMISSIONS) {
      await this.permissions.upsert(
        Permission.create({ id: newId(), key: definition.key, description: definition.description, createdAt: now }),
      );
    }
    this.logger.log(`Permission catalog seeded (${FOUNDATION_PERMISSIONS.length} definitions).`);
  }
}
