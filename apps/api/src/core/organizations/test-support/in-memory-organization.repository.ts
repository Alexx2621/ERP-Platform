import { Organization } from "../domain/organization.entity";
import { OrganizationRepository } from "../domain/organization.repository";

export class InMemoryOrganizationRepository implements OrganizationRepository {
  private readonly records = new Map<string, Organization>();

  async findById(tenantId: string, id: string): Promise<Organization | null> {
    return this.records.get(this.key(tenantId, id)) ?? null;
  }

  async findByCode(tenantId: string, code: string): Promise<Organization | null> {
    for (const organization of this.records.values()) {
      if (organization.tenantId === tenantId && organization.code === code) return organization;
    }
    return null;
  }

  async save(organization: Organization): Promise<void> {
    this.records.set(this.key(organization.tenantId, organization.id), organization);
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }
}
