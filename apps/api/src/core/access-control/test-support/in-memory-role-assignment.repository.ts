import { RoleAssignment } from "../domain/role-assignment.entity";
import { RoleAssignmentRepository } from "../domain/role-assignment.repository";

/** Does not simulate the composite-FK membership check — that is Prisma/Postgres behavior, covered by the integration suite instead. */
export class InMemoryRoleAssignmentRepository implements RoleAssignmentRepository {
  private readonly byId = new Map<string, RoleAssignment>();

  async findByMembership(tenantId: string, membershipId: string): Promise<RoleAssignment[]> {
    return [...this.byId.values()].filter(
      (a) => a.tenantId === tenantId && a.membershipId === membershipId,
    );
  }

  async save(assignment: RoleAssignment): Promise<void> {
    this.byId.set(assignment.id, assignment);
  }
}
