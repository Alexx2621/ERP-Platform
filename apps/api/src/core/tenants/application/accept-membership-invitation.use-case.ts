import { Inject, Injectable } from "@nestjs/common";
import { Membership } from "../domain/membership.entity";
import { MEMBERSHIP_REPOSITORY, type MembershipRepository } from "../domain/membership.repository";
import { TENANT_REPOSITORY, type TenantRepository } from "../domain/tenant.repository";
import { normalizeTenantSlug } from "../domain/normalize-tenant-slug";
import {
  InvitationExpiredError,
  MembershipNotFoundForUserError,
  TenantContextInactiveError,
  TenantContextNotFoundError,
} from "./errors";

export interface AcceptMembershipInvitationInput {
  tenantSlug: string;
  membershipId: string;
  userId: string;
  /** Same TTL InviteMembershipUseCase enforces — a stale invitation cannot be accepted (docs/SECURITY.md). */
  invitationTtlSeconds: number;
}

/**
 * Self-service acceptance of a pending invitation (INVITED -> ACTIVE).
 * Deliberately does NOT go through ResolveTenantContextUseCase/
 * TenantContextGuard: those require an already-ACTIVE membership, which is
 * exactly what doesn't exist yet at this point — the caller only has an
 * authenticated session, not a resolved tenant context. Tenant resolution
 * is therefore duplicated here (by slug, same as the guard) rather than
 * reused, since the guard's contract cannot be satisfied pre-acceptance.
 */
@Injectable()
export class AcceptMembershipInvitationUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly memberships: MembershipRepository,
  ) {}

  async execute(input: AcceptMembershipInvitationInput): Promise<Membership> {
    const tenant = await this.tenants.findBySlug(normalizeTenantSlug(input.tenantSlug));
    if (!tenant) throw new TenantContextNotFoundError();
    if (!tenant.isActive()) throw new TenantContextInactiveError();

    const membership = await this.memberships.findById(tenant.id, input.membershipId);
    if (!membership || membership.userId !== input.userId) {
      throw new MembershipNotFoundForUserError();
    }
    if (membership.isExpiredInvitation(new Date(), input.invitationTtlSeconds)) {
      throw new InvitationExpiredError();
    }

    membership.activate();
    await this.memberships.save(membership);
    return membership;
  }
}
