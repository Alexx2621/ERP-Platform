import { newId } from "@erp/database";
import { InMemoryPermissionRepository } from "../../test-support/in-memory-permission.repository";
import { InMemoryRoleRepository } from "../../test-support/in-memory-role.repository";
import { InMemoryRoleAssignmentRepository } from "../../test-support/in-memory-role-assignment.repository";
import { Permission } from "../../domain/permission.entity";
import { CreateRoleUseCase } from "./create-role.use-case";
import { AssignRoleUseCase } from "./assign-role.use-case";
import { DuplicateRoleAssignmentError, RoleNotFoundError } from "../errors";

async function buildContext() {
  const permissions = new InMemoryPermissionRepository();
  await permissions.upsert(
    Permission.create({ id: newId(), key: "access.roles.read", description: "x", createdAt: new Date() }),
  );
  const roles = new InMemoryRoleRepository();
  const assignments = new InMemoryRoleAssignmentRepository();
  const createRole = new CreateRoleUseCase(roles, permissions);
  const assignRole = new AssignRoleUseCase(roles, assignments);
  const role = await createRole.execute({
    tenantId: "tenant-a",
    name: "Auditor",
    permissionKeys: ["access.roles.read"],
  });
  return { roles, assignments, assignRole, role };
}

describe("AssignRoleUseCase", () => {
  it("assigns a role at TENANT scope", async () => {
    const { assignRole, assignments, role } = await buildContext();

    const assignment = await assignRole.execute({
      tenantId: "tenant-a",
      membershipId: "membership-1",
      roleId: role.id,
      scopeType: "TENANT",
    });

    expect(assignment.scopeId).toBeNull();
    expect(await assignments.findByMembership("tenant-a", "membership-1")).toHaveLength(1);
  });

  it("normalizes a stray scopeId to null for a TENANT-scoped assignment", async () => {
    const { assignRole, role } = await buildContext();

    const assignment = await assignRole.execute({
      tenantId: "tenant-a",
      membershipId: "membership-1",
      roleId: role.id,
      scopeType: "TENANT",
      scopeId: "should-be-ignored",
    });

    expect(assignment.scopeId).toBeNull();
  });

  it("assigns a role at COMPANY scope", async () => {
    const { assignRole, role } = await buildContext();

    const assignment = await assignRole.execute({
      tenantId: "tenant-a",
      membershipId: "membership-1",
      roleId: role.id,
      scopeType: "COMPANY",
      scopeId: "company-1",
    });

    expect(assignment.scopeId).toBe("company-1");
  });

  it("rejects assigning a role that does not exist in the tenant", async () => {
    const { assignRole } = await buildContext();

    await expect(
      assignRole.execute({
        tenantId: "tenant-a",
        membershipId: "membership-1",
        roleId: "unknown-role",
        scopeType: "TENANT",
      }),
    ).rejects.toThrow(RoleNotFoundError);
  });

  it("rejects assigning the exact same role/scope to the same membership twice", async () => {
    const { assignRole, role } = await buildContext();
    await assignRole.execute({
      tenantId: "tenant-a",
      membershipId: "membership-1",
      roleId: role.id,
      scopeType: "TENANT",
    });

    await expect(
      assignRole.execute({
        tenantId: "tenant-a",
        membershipId: "membership-1",
        roleId: role.id,
        scopeType: "TENANT",
      }),
    ).rejects.toThrow(DuplicateRoleAssignmentError);
  });
});
