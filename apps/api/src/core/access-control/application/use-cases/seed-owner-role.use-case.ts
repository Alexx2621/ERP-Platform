import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { Role } from "../../domain/role.entity";
import { ROLE_REPOSITORY, RoleRepository } from "../../domain/role.repository";
import { PERMISSION_REPOSITORY, PermissionRepository } from "../../domain/permission.repository";
import { RoleAssignment } from "../../domain/role-assignment.entity";
import {
  ROLE_ASSIGNMENT_REPOSITORY,
  RoleAssignmentRepository,
} from "../../domain/role-assignment.repository";

export const OWNER_ROLE_NAME = "Owner";

/**
 * Called by TenantsController right after provisioning succeeds — without
 * this, a brand-new tenant's owner would have an active Membership but zero
 * permissions, unable to even manage roles to grant themselves access
 * (docs/WORK_QUEUE.md: closing that gap was part of shipping RBAC at all).
 * Grants every permission that exists *at provisioning time* — a
 * deliberately simple "all current permissions" policy; it does not
 * retroactively update existing tenants' Owner roles when new permissions
 * are added later (that is a future migration/backfill concern, not this
 * use case's job).
 */
@Injectable()
export class SeedOwnerRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(PERMISSION_REPOSITORY) private readonly permissions: PermissionRepository,
    @Inject(ROLE_ASSIGNMENT_REPOSITORY) private readonly assignments: RoleAssignmentRepository,
  ) {}

  async execute(tenantId: string, ownerMembershipId: string): Promise<void> {
    const allPermissions = await this.permissions.findAll();
    const now = new Date();

    const role = Role.create({
      id: newId(),
      tenantId,
      name: OWNER_ROLE_NAME,
      isSystem: true,
      permissionKeys: allPermissions.map((p) => p.key),
      createdAt: now,
      updatedAt: now,
    });
    await this.roles.save(role);

    const assignment = RoleAssignment.create({
      id: newId(),
      tenantId,
      membershipId: ownerMembershipId,
      roleId: role.id,
      scopeType: "TENANT",
      scopeId: null,
      createdAt: now,
    });
    await this.assignments.save(assignment);
  }
}
