import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { RoleAssignment, RoleAssignmentScope } from "../../domain/role-assignment.entity";
import {
  ROLE_ASSIGNMENT_REPOSITORY,
  RoleAssignmentRepository,
} from "../../domain/role-assignment.repository";
import { ROLE_REPOSITORY, RoleRepository } from "../../domain/role.repository";
import { DuplicateRoleAssignmentError, RoleNotFoundError } from "../errors";

export interface AssignRoleInput {
  tenantId: string;
  membershipId: string;
  roleId: string;
  scopeType: RoleAssignmentScope;
  scopeId?: string;
}

@Injectable()
export class AssignRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(ROLE_ASSIGNMENT_REPOSITORY) private readonly assignments: RoleAssignmentRepository,
  ) {}

  async execute(input: AssignRoleInput): Promise<RoleAssignment> {
    const role = await this.roles.findById(input.tenantId, input.roleId);
    if (!role) {
      throw new RoleNotFoundError(input.roleId);
    }

    const existing = await this.assignments.findByMembership(input.tenantId, input.membershipId);
    // A TENANT-scoped grant never carries a scopeId, regardless of what the
    // caller sent — the domain invariant (RoleAssignment.create) would reject
    // a mismatch anyway; normalizing here keeps that from ever surfacing as
    // an unexpected 500 for a client mistake instead of just being ignored.
    const scopeId = input.scopeType === "TENANT" ? null : (input.scopeId ?? null);
    const isDuplicate = existing.some(
      (a) => a.roleId === input.roleId && a.scopeType === input.scopeType && a.scopeId === scopeId,
    );
    if (isDuplicate) {
      throw new DuplicateRoleAssignmentError();
    }

    const assignment = RoleAssignment.create({
      id: newId(),
      tenantId: input.tenantId,
      membershipId: input.membershipId,
      roleId: input.roleId,
      scopeType: input.scopeType,
      scopeId,
      createdAt: new Date(),
    });
    await this.assignments.save(assignment);
    return assignment;
  }
}
