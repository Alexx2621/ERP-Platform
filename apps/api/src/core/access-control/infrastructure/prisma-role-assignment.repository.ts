import { Injectable } from "@nestjs/common";
import { Prisma } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { RoleAssignment } from "../domain/role-assignment.entity";
import { RoleAssignmentRepository } from "../domain/role-assignment.repository";
import { MembershipNotFoundInTenantError } from "../application/errors";

const FOREIGN_KEY_VIOLATION = "P2003";

@Injectable()
export class PrismaRoleAssignmentRepository implements RoleAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByMembership(tenantId: string, membershipId: string): Promise<RoleAssignment[]> {
    const records = await this.prisma.roleAssignment.findMany({ where: { tenantId, membershipId } });
    return records.map((record) => RoleAssignment.create(record));
  }

  async save(assignment: RoleAssignment): Promise<void> {
    const props = assignment.toProps();
    try {
      await this.prisma.roleAssignment.create({ data: props });
    } catch (error) {
      // The composite (tenantId, membershipId) FK is what actually prevents a
      // cross-tenant membershipId — this module never queries Tenants'
      // Membership table directly to pre-validate (see architecture note in
      // docs/SECURITY.md), so a violation here means "no such membership in
      // this tenant", not a generic 500.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === FOREIGN_KEY_VIOLATION) {
        throw new MembershipNotFoundInTenantError();
      }
      throw error;
    }
  }
}
