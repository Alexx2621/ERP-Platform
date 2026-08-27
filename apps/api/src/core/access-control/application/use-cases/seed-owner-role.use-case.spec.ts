import { newId } from "@erp/database";
import { InMemoryPermissionRepository } from "../../test-support/in-memory-permission.repository";
import { InMemoryRoleRepository } from "../../test-support/in-memory-role.repository";
import { InMemoryRoleAssignmentRepository } from "../../test-support/in-memory-role-assignment.repository";
import { Permission } from "../../domain/permission.entity";
import { SeedOwnerRoleUseCase, OWNER_ROLE_NAME } from "./seed-owner-role.use-case";
import { HasPermissionUseCase } from "./has-permission.use-case";

describe("SeedOwnerRoleUseCase", () => {
  it("creates a system Owner role with every permission that exists and grants it at TENANT scope", async () => {
    const permissions = new InMemoryPermissionRepository();
    await permissions.upsert(
      Permission.create({ id: newId(), key: "access.roles.read", description: "x", createdAt: new Date() }),
    );
    await permissions.upsert(
      Permission.create({ id: newId(), key: "access.roles.manage", description: "x", createdAt: new Date() }),
    );
    const roles = new InMemoryRoleRepository();
    const assignments = new InMemoryRoleAssignmentRepository();
    const useCase = new SeedOwnerRoleUseCase(roles, permissions, assignments);
    const hasPermission = new HasPermissionUseCase(assignments, roles);

    await useCase.execute("tenant-a", "membership-owner");

    const role = await roles.findByName("tenant-a", OWNER_ROLE_NAME);
    expect(role).not.toBeNull();
    expect(role?.isSystem).toBe(true);
    expect(role?.hasPermission("access.roles.read")).toBe(true);
    expect(role?.hasPermission("access.roles.manage")).toBe(true);

    await expect(
      hasPermission.execute({
        tenantId: "tenant-a",
        membershipId: "membership-owner",
        permissionKey: "access.roles.manage",
        companyId: "any-company",
      }),
    ).resolves.toBe(true);
  });

  it("does not grant the owner's permissions to a different membership", async () => {
    const permissions = new InMemoryPermissionRepository();
    await permissions.upsert(
      Permission.create({ id: newId(), key: "access.roles.read", description: "x", createdAt: new Date() }),
    );
    const roles = new InMemoryRoleRepository();
    const assignments = new InMemoryRoleAssignmentRepository();
    const useCase = new SeedOwnerRoleUseCase(roles, permissions, assignments);
    const hasPermission = new HasPermissionUseCase(assignments, roles);

    await useCase.execute("tenant-a", "membership-owner");

    await expect(
      hasPermission.execute({
        tenantId: "tenant-a",
        membershipId: "membership-other",
        permissionKey: "access.roles.read",
      }),
    ).resolves.toBe(false);
  });
});
