import { Inject, Injectable } from "@nestjs/common";
import { MEMBERSHIP_REPOSITORY, MembershipRepository } from "../domain/membership.repository";
import { TENANT_REPOSITORY, TenantRepository } from "../domain/tenant.repository";

export interface MyTenantSummary {
  tenantId: string;
  slug: string;
  name: string;
  membershipId: string;
}

/**
 * Answers "which tenants can this user access" — the one place a query is
 * intentionally unscoped by tenant, since by definition no tenant is known
 * yet (tenant picker / onboarding, see MembershipRepository.findActiveByUserId).
 */
@Injectable()
export class ListMyTenantsUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY) private readonly memberships: MembershipRepository,
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
  ) {}

  async execute(userId: string): Promise<MyTenantSummary[]> {
    const activeMemberships = await this.memberships.findActiveByUserId(userId);

    const summaries: MyTenantSummary[] = [];
    for (const membership of activeMemberships) {
      const tenant = await this.tenants.findById(membership.tenantId);
      if (!tenant || !tenant.isActive()) continue;
      summaries.push({
        tenantId: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        membershipId: membership.id,
      });
    }
    return summaries;
  }
}
