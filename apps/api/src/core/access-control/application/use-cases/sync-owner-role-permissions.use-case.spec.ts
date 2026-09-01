import { newId } from "@erp/database";
import { InMemoryPermissionRepository } from "../../test-support/in-memory-permission.repository";
import { InMemoryRoleRepository } from "../../test-support/in-memory-role.repository";
import { Permission } from "../../domain/permission.entity";
import { Role } from "../../domain/role.entity";
import { SyncOwnerRolePermissionsUseCase } from "./sync-owner-role-permissions.use-case";
import { OWNER_ROLE_NAME } from "./seed-owner-role.use-case";

async function addPermission(permissions: InMemoryPermissionRepository, key: string): Promise<void> {
  await permissions.upsert(Permission.create({ id: newId(), key, description: "x", createdAt: new Date() }));
}

describe("SyncOwnerRolePermissionsUseCase", () => {
  it("grants a stale Owner role every permission added to the catalog since it was seeded", async () => {
    const permissions = new InMemoryPermissionRepository();
    await addPermission(permissions, "access.roles.read");
    await addPermission(permissions, "access.roles.manage");
    await addPermission(permissions, "catalog.products.read");
    await addPermission(permissions, "sales.orders.manage");

    const roles = new InMemoryRoleRepository();
    const staleOwner = Role.create({
      id: newId(),
      tenantId: "tenant-a",
      name: OWNER_ROLE_NAME,
      isSystem: true,
      permissionKeys: ["access.roles.read", "access.roles.manage"],
      createdAt: new Date("2026-08-27T00:00:00.000Z"),
      updatedAt: new Date("2026-08-27T00:00:00.000Z"),
    });
    await roles.save(staleOwner);

    const useCase = new SyncOwnerRolePermissionsUseCase(roles, permissions);
    await useCase.execute();

    const synced = await roles.findByName("tenant-a", OWNER_ROLE_NAME);
    expect(synced?.hasPermission("access.roles.read")).toBe(true);
    expect(synced?.hasPermission("access.roles.manage")).toBe(true);
    expect(synced?.hasPermission("catalog.products.read")).toBe(true);
    expect(synced?.hasPermission("sales.orders.manage")).toBe(true);
  });

  it("does not rewrite an Owner role that is already fully synced", async () => {
    const permissions = new InMemoryPermissionRepository();
    await addPermission(permissions, "access.roles.read");

    const roles = new InMemoryRoleRepository();
    const upToDateOwner = Role.create({
      id: newId(),
      tenantId: "tenant-a",
      name: OWNER_ROLE_NAME,
      isSystem: true,
      permissionKeys: ["access.roles.read"],
      createdAt: new Date(),
      updatedAt: new Date("2026-08-27T00:00:00.000Z"),
    });
    await roles.save(upToDateOwner);
    const saveSpy = jest.spyOn(roles, "save");

    const useCase = new SyncOwnerRolePermissionsUseCase(roles, permissions);
    await useCase.execute();

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("never touches a tenant's custom, non-system role even if it shares the Owner role's name", async () => {
    const permissions = new InMemoryPermissionRepository();
    await addPermission(permissions, "access.roles.read");
    await addPermission(permissions, "catalog.products.read");

    const roles = new InMemoryRoleRepository();
    const customRole = Role.create({
      id: newId(),
      tenantId: "tenant-a",
      name: OWNER_ROLE_NAME,
      isSystem: false,
      permissionKeys: ["access.roles.read"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await roles.save(customRole);

    const useCase = new SyncOwnerRolePermissionsUseCase(roles, permissions);
    await useCase.execute();

    const unchanged = await roles.findByName("tenant-a", OWNER_ROLE_NAME);
    expect(unchanged?.hasPermission("catalog.products.read")).toBe(false);
  });

  it("syncs every tenant's Owner role independently", async () => {
    const permissions = new InMemoryPermissionRepository();
    await addPermission(permissions, "access.roles.read");
    await addPermission(permissions, "catalog.products.read");

    const roles = new InMemoryRoleRepository();
    await roles.save(
      Role.create({
        id: newId(),
        tenantId: "tenant-a",
        name: OWNER_ROLE_NAME,
        isSystem: true,
        permissionKeys: ["access.roles.read"],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    await roles.save(
      Role.create({
        id: newId(),
        tenantId: "tenant-b",
        name: OWNER_ROLE_NAME,
        isSystem: true,
        permissionKeys: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const useCase = new SyncOwnerRolePermissionsUseCase(roles, permissions);
    await useCase.execute();

    const ownerA = await roles.findByName("tenant-a", OWNER_ROLE_NAME);
    const ownerB = await roles.findByName("tenant-b", OWNER_ROLE_NAME);
    expect(ownerA?.hasPermission("catalog.products.read")).toBe(true);
    expect(ownerB?.hasPermission("access.roles.read")).toBe(true);
    expect(ownerB?.hasPermission("catalog.products.read")).toBe(true);
  });
});
