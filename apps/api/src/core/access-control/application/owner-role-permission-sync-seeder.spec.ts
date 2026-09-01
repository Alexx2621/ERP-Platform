import { OwnerRolePermissionSyncSeeder } from "./owner-role-permission-sync-seeder";
import { PermissionCatalogSeeder } from "./permission-catalog-seeder";
import { SyncOwnerRolePermissionsUseCase } from "./use-cases/sync-owner-role-permissions.use-case";

describe("OwnerRolePermissionSyncSeeder", () => {
  it("seeds the permission catalog before syncing Owner roles, not relying on onModuleInit ordering", async () => {
    const calls: string[] = [];
    const catalogSeeder = {
      seed: jest.fn().mockImplementation(async () => {
        calls.push("catalog");
      }),
    } as unknown as PermissionCatalogSeeder;
    const syncOwnerRolePermissions = {
      execute: jest.fn().mockImplementation(async () => {
        calls.push("sync");
      }),
    } as unknown as SyncOwnerRolePermissionsUseCase;

    const seeder = new OwnerRolePermissionSyncSeeder(catalogSeeder, syncOwnerRolePermissions);
    await seeder.onModuleInit();

    expect(calls).toEqual(["catalog", "sync"]);
  });
});
