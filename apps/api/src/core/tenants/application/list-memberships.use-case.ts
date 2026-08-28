import { Inject, Injectable } from "@nestjs/common";
import { USER_REPOSITORY, type User, type UserRepository } from "../../users";
import { Membership } from "../domain/membership.entity";
import { MEMBERSHIP_REPOSITORY, type MembershipRepository } from "../domain/membership.repository";

export interface MembershipWithUser {
  membership: Membership;
  user: User;
}

/**
 * The member list a tenant admin needs to assign roles to (feeds the RBAC
 * UI, which today requires typing a raw membershipId). Resolves each
 * membership's User individually rather than adding a batch lookup to
 * UserRepository — Foundation-scale tenants have at most a handful of
 * members, so N+1 here is not the premature-optimization tradeoff
 * MASTER_SPEC §45/§93 warns against yet; revisit if that stops being true.
 */
@Injectable()
export class ListMembershipsUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY) private readonly memberships: MembershipRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(tenantId: string): Promise<MembershipWithUser[]> {
    const memberships = await this.memberships.findByTenant(tenantId);
    const results: MembershipWithUser[] = [];
    for (const membership of memberships) {
      const user = await this.users.findById(membership.userId);
      if (user) results.push({ membership, user });
    }
    return results;
  }
}
