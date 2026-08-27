import { newId } from "@erp/database";
import { InMemoryPermissionRepository } from "../../test-support/in-memory-permission.repository";
import { InMemoryRoleRepository } from "../../test-support/in-memory-role.repository";
import { InMemoryRoleAssignmentRepository } from "../../test-support/in-memory-role-assignment.repository";
import { Permission } from "../../domain/permission.entity";
import { CreateRoleUseCase } from "./create-role.use-case";
import { AssignRoleUseCase } from "./assign-role.use-case";
import { HasPermissionUseCase } from "./has-permission.use-case";

async function buildContext() {
  const permissions = new InMemoryPermissionRepository();
  for (const key of ["access.roles.read", "access.roles.manage"]) {
    await permissions.upsert(Permission.create({ id: newId(), key, description: key, createdAt: new Date() }));
  }
  const roles = new InMemoryRoleRepository();
  const assignments = new InMemoryRoleAssignmentRepository();
  const createRole = new CreateRoleUseCase(roles, permissions);
  const assignRole = new AssignRoleUseCase(roles, assignments);
  const hasPermission = new HasPermissionUseCase(assignments, roles);
  return { createRole, assignRole, hasPermission };
}

describe("HasPermissionUseCase", () => {
  it("denies by default when the membership has no role assignments", async () => {
    const { hasPermission } = await buildContext();

    await expect(
      hasPermission.execute({
        tenantId: "tenant-a",
        membershipId: "membership-1",
        permissionKey: "access.roles.read",
      }),
    ).resolves.toBe(false);
  });

  it("grants a permission included in a TENANT-scoped role, regardless of company", async () => {
    const { createRole, assignRole, hasPermission } = await buildContext();
    const role = await createRole.execute({
      tenantId: "tenant-a",
      name: "Reader",
      permissionKeys: ["access.roles.read"],
    });
    await assignRole.execute({
      tenantId: "tenant-a",
      membershipId: "membership-1",
      roleId: role.id,
      scopeType: "TENANT",
    });

    await expect(
      hasPermission.execute({
        tenantId: "tenant-a",
        membershipId: "membership-1",
        permissionKey: "access.roles.read",
        companyId: "any-company",
      }),
    ).resolves.toBe(true);
  });

  it("denies a permission the assigned role does not include", async () => {
    const { createRole, assignRole, hasPermission } = await buildContext();
    const role = await createRole.execute({
      tenantId: "tenant-a",
      name: "Reader",
      permissionKeys: ["access.roles.read"],
    });
    await assignRole.execute({
      tenantId: "tenant-a",
      membershipId: "membership-1",
      roleId: role.id,
      scopeType: "TENANT",
    });

    await expect(
      hasPermission.execute({
        tenantId: "tenant-a",
        membershipId: "membership-1",
        permissionKey: "access.roles.manage",
      }),
    ).resolves.toBe(false);
  });

  it("a COMPANY-scoped grant does not cover a different company", async () => {
    const { createRole, assignRole, hasPermission } = await buildContext();
    const role = await createRole.execute({
      tenantId: "tenant-a",
      name: "Manager",
      permissionKeys: ["access.roles.manage"],
    });
    await assignRole.execute({
      tenantId: "tenant-a",
      membershipId: "membership-1",
      roleId: role.id,
      scopeType: "COMPANY",
      scopeId: "company-1",
    });

    await expect(
      hasPermission.execute({
        tenantId: "tenant-a",
        membershipId: "membership-1",
        permissionKey: "access.roles.manage",
        companyId: "company-1",
      }),
    ).resolves.toBe(true);
    await expect(
      hasPermission.execute({
        tenantId: "tenant-a",
        membershipId: "membership-1",
        permissionKey: "access.roles.manage",
        companyId: "company-2",
      }),
    ).resolves.toBe(false);
    await expect(
      hasPermission.execute({
        tenantId: "tenant-a",
        membershipId: "membership-1",
        permissionKey: "access.roles.manage",
      }),
    ).resolves.toBe(false);
  });

  it("never grants access using another tenant's role assignments", async () => {
    const { createRole, assignRole, hasPermission } = await buildContext();
    const role = await createRole.execute({
      tenantId: "tenant-a",
      name: "Reader",
      permissionKeys: ["access.roles.read"],
    });
    await assignRole.execute({
      tenantId: "tenant-a",
      membershipId: "membership-1",
      roleId: role.id,
      scopeType: "TENANT",
    });

    await expect(
      hasPermission.execute({
        tenantId: "tenant-b",
        membershipId: "membership-1",
        permissionKey: "access.roles.read",
      }),
    ).resolves.toBe(false);
  });
});
