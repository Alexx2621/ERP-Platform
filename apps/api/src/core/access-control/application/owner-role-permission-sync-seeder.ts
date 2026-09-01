import { Injectable, OnModuleInit } from "@nestjs/common";
import { PermissionCatalogSeeder } from "./permission-catalog-seeder";
import { SyncOwnerRolePermissionsUseCase } from "./use-cases/sync-owner-role-permissions.use-case";

/**
 * Runs on every API boot. Explicitly awaits `PermissionCatalogSeeder.seed()`
 * before syncing — not relying on NestJS's same-module `onModuleInit`
 * ordering, which this codebase has previously found to be an unsafe
 * assumption (see the RolesController module-cycle lesson in
 * `docs/PROJECT_STATE.md` "Corregido durante la implementación de RBAC").
 * `PermissionCatalogSeeder`'s own `onModuleInit` still runs independently
 * too; both calls are idempotent, so the tiny redundancy on boot is
 * harmless and keeps correctness independent of provider instantiation
 * order.
 */
@Injectable()
export class OwnerRolePermissionSyncSeeder implements OnModuleInit {
  constructor(
    private readonly catalogSeeder: PermissionCatalogSeeder,
    private readonly syncOwnerRolePermissions: SyncOwnerRolePermissionsUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.catalogSeeder.seed();
    await this.syncOwnerRolePermissions.execute();
  }
}
