import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { normalizeEmail, USER_REPOSITORY, type User, type UserRepository } from "../../users";
import { Membership } from "../domain/membership.entity";
import { MEMBERSHIP_REPOSITORY, type MembershipRepository } from "../domain/membership.repository";
import {
  InvitedUserDisabledError,
  InvitedUserNotFoundError,
  MembershipAlreadyExistsError,
} from "./errors";

export interface InviteMembershipInput {
  tenantId: string;
  email: string;
}

export interface InvitedMembership {
  membership: Membership;
  user: User;
}

/**
 * Adds a second (or Nth) user to a tenant. Requires the invitee to already
 * have a User account — there is no passwordless/pending-account creation by
 * email (MASTER_SPEC §90 "Do not simulate integrations"), so an unknown
 * email is a real 404, not a deferred invite. The membership starts
 * INVITED; the invitee must call AcceptMembershipInvitationUseCase
 * themselves before it becomes usable (docs/MULTITENANCY.md membership
 * state machine).
 */
@Injectable()
export class InviteMembershipUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY) private readonly memberships: MembershipRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(input: InviteMembershipInput): Promise<InvitedMembership> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));
    if (!user) throw new InvitedUserNotFoundError();
    if (!user.isActive()) throw new InvitedUserDisabledError();

    const existing = await this.memberships.findByUserId(input.tenantId, user.id);
    if (existing) throw new MembershipAlreadyExistsError();

    const now = new Date();
    const membership = Membership.create({
      id: newId(),
      tenantId: input.tenantId,
      userId: user.id,
      status: "INVITED",
      createdAt: now,
      updatedAt: now,
    });
    await this.memberships.save(membership);
    return { membership, user };
  }
}
