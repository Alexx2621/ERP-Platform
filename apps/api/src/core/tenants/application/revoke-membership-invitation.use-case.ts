import { Inject, Injectable } from "@nestjs/common";
import { Membership } from "../domain/membership.entity";
import { MEMBERSHIP_REPOSITORY, type MembershipRepository } from "../domain/membership.repository";
import { MembershipInvitationNotFoundError, MembershipNotInvitedError } from "./errors";

export interface RevokeMembershipInvitationInput {
  tenantId: string;
  membershipId: string;
}

/**
 * Lets a tenant admin cancel a pending invitation before it is accepted
 * (docs/WORK_QUEUE.md — `Membership.revoke()` existed in the domain since
 * the invitation feature was built, but no endpoint ever invoked it).
 * Deliberately scoped to INVITED only: `Membership.revoke()` itself accepts
 * any non-REVOKED status, but "revoke an invitation" and "remove an active
 * member" are different, differently-sensitive operations — the latter is
 * not built yet and this endpoint must not become a backdoor for it.
 */
@Injectable()
export class RevokeMembershipInvitationUseCase {
  constructor(@Inject(MEMBERSHIP_REPOSITORY) private readonly memberships: MembershipRepository) {}

  async execute(input: RevokeMembershipInvitationInput): Promise<Membership> {
    const membership = await this.memberships.findById(input.tenantId, input.membershipId);
    if (!membership) throw new MembershipInvitationNotFoundError();
    if (membership.status !== "INVITED") throw new MembershipNotInvitedError();

    membership.revoke();
    await this.memberships.save(membership);
    return membership;
  }
}
