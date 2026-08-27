import { newId } from "@erp/database";
import { InMemoryPermissionRepository } from "../../test-support/in-memory-permission.repository";
import { InMemoryRoleRepository } from "../../test-support/in-memory-role.repository";
import { Permission } from "../../domain/permission.entity";
import { CreateRoleUseCase } from "./create-role.use-case";
import { RoleNameAlreadyInUseError, UnknownPermissionKeysError } from "../errors";

async function seedPermission(permissions: InMemoryPermissionRepository, key: string): Promise<void> {
  await permissions.upsert(Permission.create({ id: newId(), key, description: key, createdAt: new Date() }));
}

describe("CreateRoleUseCase", () => {
  it("creates a role with the given permissions", async () => {
    const permissions = new InMemoryPermissionRepository();
    await seedPermission(permissions, "access.roles.read");
    const roles = new InMemoryRoleRepository();
    const useCase = new CreateRoleUseCase(roles, permissions);

    const role = await useCase.execute({
      tenantId: "tenant-a",
      name: "Auditor",
      permissionKeys: ["access.roles.read"],
    });

    expect(role.name).toBe("Auditor");
    expect(role.hasPermission("access.roles.read")).toBe(true);
    expect(await roles.findByName("tenant-a", "Auditor")).not.toBeNull();
  });

  it("rejects a duplicate role name within the same tenant", async () => {
    const permissions = new InMemoryPermissionRepository();
    await seedPermission(permissions, "access.roles.read");
    const roles = new InMemoryRoleRepository();
    const useCase = new CreateRoleUseCase(roles, permissions);
    await useCase.execute({ tenantId: "tenant-a", name: "Auditor", permissionKeys: ["access.roles.read"] });

    await expect(
      useCase.execute({ tenantId: "tenant-a", name: "Auditor", permissionKeys: ["access.roles.read"] }),
    ).rejects.toThrow(RoleNameAlreadyInUseError);
  });

  it("allows the same role name in a different tenant", async () => {
    const permissions = new InMemoryPermissionRepository();
    await seedPermission(permissions, "access.roles.read");
    const roles = new InMemoryRoleRepository();
    const useCase = new CreateRoleUseCase(roles, permissions);
    await useCase.execute({ tenantId: "tenant-a", name: "Auditor", permissionKeys: ["access.roles.read"] });

    await expect(
      useCase.execute({ tenantId: "tenant-b", name: "Auditor", permissionKeys: ["access.roles.read"] }),
    ).resolves.toBeDefined();
  });

  it("rejects unknown permission keys", async () => {
    const roles = new InMemoryRoleRepository();
    const useCase = new CreateRoleUseCase(roles, new InMemoryPermissionRepository());

    await expect(
      useCase.execute({ tenantId: "tenant-a", name: "Ghost", permissionKeys: ["does.not.exist"] }),
    ).rejects.toThrow(UnknownPermissionKeysError);
  });
});
