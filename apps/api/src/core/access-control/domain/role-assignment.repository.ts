import { RoleAssignment } from "./role-assignment.entity";

export interface RoleAssignmentRepository {
  findByMembership(tenantId: string, membershipId: string): Promise<RoleAssignment[]>;
  /** Throws MembershipNotFoundInTenantError if the (tenantId, membershipId) FK is not satisfied. */
  save(assignment: RoleAssignment): Promise<void>;
}

export const ROLE_ASSIGNMENT_REPOSITORY = Symbol("ROLE_ASSIGNMENT_REPOSITORY");
