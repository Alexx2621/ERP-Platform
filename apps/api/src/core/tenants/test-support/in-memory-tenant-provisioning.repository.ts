import {
  FindProvisionedTenantInput,
  ProvisionedTenant,
  TenantProvisioningRepository,
} from "../application/ports/tenant-provisioning.repository";
import { InMemoryMembershipRepository } from "./in-memory-membership.repository";
import { InMemoryTenantRepository } from "./in-memory-tenant.repository";

export class InMemoryTenantProvisioningRepository implements TenantProvisioningRepository {
  private readonly records = new Map<string, ProvisionedTenant>();

  constructor(
    private readonly tenants: InMemoryTenantRepository,
    private readonly memberships: InMemoryMembershipRepository,
  ) {}

  async findExisting(input: FindProvisionedTenantInput): Promise<ProvisionedTenant | null> {
    const record = this.records.get(input.slug);
    if (!record) return null;
    if (record.ownerMembership.userId !== input.ownerUserId) return null;
    if (record.organization.code !== input.organizationCode) return null;
    if (record.company?.code !== input.companyCode) return null;
    return record;
  }

  async create(provisioned: ProvisionedTenant): Promise<void> {
    this.records.set(provisioned.tenant.slug, provisioned);
    await this.tenants.save(provisioned.tenant);
    await this.memberships.save(provisioned.ownerMembership);
  }
}
