import { Opportunity } from "../domain/opportunity.entity";
import { ListOpportunitiesFilter, OpportunityRepository } from "../domain/opportunity.repository";

export class InMemoryOpportunityRepository implements OpportunityRepository {
  private readonly byId = new Map<string, Opportunity>();

  async findById(tenantId: string, id: string): Promise<Opportunity | null> {
    const opportunity = this.byId.get(id);
    return opportunity && opportunity.tenantId === tenantId ? opportunity : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListOpportunitiesFilter): Promise<Opportunity[]> {
    return [...this.byId.values()]
      .filter(
        (o) =>
          o.tenantId === tenantId &&
          o.companyId === companyId &&
          (filter.pipelineId === undefined || o.pipelineId === filter.pipelineId) &&
          (filter.stageId === undefined || o.stageId === filter.stageId) &&
          (filter.status === undefined || o.status === filter.status) &&
          (filter.ownerId === undefined || o.ownerId === filter.ownerId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async listOpenByPipeline(tenantId: string, pipelineId: string): Promise<Opportunity[]> {
    return [...this.byId.values()].filter((o) => o.tenantId === tenantId && o.pipelineId === pipelineId && o.status === "OPEN");
  }

  async save(opportunity: Opportunity): Promise<void> {
    this.byId.set(opportunity.id, opportunity);
  }
}
