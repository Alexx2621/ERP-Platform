import { Inject, Injectable } from "@nestjs/common";
import {
  ROLE_ASSIGNMENT_REPOSITORY,
  RoleAssignmentRepository,
} from "../../domain/role-assignment.repository";
import { ROLE_REPOSITORY, RoleRepository } from "../../domain/role.repository";

export interface HasPermissionInput {
  tenantId: string;
  membershipId: string;
  companyId?: string;
  permissionKey: string;
}

/**
 * The core authorization check (docs/MULTITENANCY.md §9.3:
 * `role_assignment.covers_scope AND permission.granted`). Used by
 * PermissionGuard — deny by default, no permission found means no access.
 */
@Injectable()
export class HasPermissionUseCase {
  constructor(
    @Inject(ROLE_ASSIGNMENT_REPOSITORY) private readonly assignments: RoleAssignmentRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
  ) {}

  async execute(input: HasPermissionInput): Promise<boolean> {
    const assignments = await this.assignments.findByMembership(input.tenantId, input.membershipId);
    const coveringRoleIds = [
      ...new Set(
        assignments
          .filter((assignment) => assignment.covers({ companyId: input.companyId }))
          .map((assignment) => assignment.roleId),
      ),
    ];
    if (coveringRoleIds.length === 0) {
      return false;
    }

    const roles = await this.roles.findByIds(input.tenantId, coveringRoleIds);
    return roles.some((role) => role.hasPermission(input.permissionKey));
  }
}
