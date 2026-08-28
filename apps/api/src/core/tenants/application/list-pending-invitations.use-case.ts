import { Inject, Injectable } from "@nestjs/common";
import { Membership } from "../domain/membership.entity";
import { MEMBERSHIP_REPOSITORY, type MembershipRepository } from "../domain/membership.repository";
import { TENANT_REPOSITORY, type TenantRepository } from "../domain/tenant.repository";

export interface PendingInvitation {
  membership: Membership;
  tenantSlug: string;
  tenantName: string;
}

/**
 * "Which invitations are waiting for me" — the counterpart to
 * ListMyTenantsUseCase (which only shows tenants with an ACTIVE
 * membership). Feeds both the accept-invitation UI and, indirectly, the
 * in-app notification sent at invite time (its `data` payload carries the
 * same tenantSlug/membershipId this returns).
 */
@Injectable()
export class ListPendingInvitationsUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY) private readonly memberships: MembershipRepository,
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
  ) {}

  async execute(userId: string): Promise<PendingInvitation[]> {
    const pending = await this.memberships.findPendingByUserId(userId);
    const results: PendingInvitation[] = [];
    for (const membership of pending) {
      const tenant = await this.tenants.findById(membership.tenantId);
      if (tenant) results.push({ membership, tenantSlug: tenant.slug, tenantName: tenant.name });
    }
    return results;
  }
}
