import { Lead } from "../domain/lead.entity";
import { LeadRepository, ListLeadsFilter } from "../domain/lead.repository";

export class InMemoryLeadRepository implements LeadRepository {
  private readonly byId = new Map<string, Lead>();

  async findById(tenantId: string, id: string): Promise<Lead | null> {
    const lead = this.byId.get(id);
    return lead && lead.tenantId === tenantId ? lead : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListLeadsFilter): Promise<Lead[]> {
    return [...this.byId.values()]
      .filter(
        (l) =>
          l.tenantId === tenantId &&
          l.companyId === companyId &&
          (filter.status === undefined || l.status === filter.status) &&
          (filter.ownerId === undefined || l.ownerId === filter.ownerId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async save(lead: Lead): Promise<void> {
    this.byId.set(lead.id, lead);
  }
}
