import { Opportunity, OpportunityStatus } from "./opportunity.entity";

export interface ListOpportunitiesFilter {
  pipelineId?: string;
  stageId?: string;
  status?: OpportunityStatus;
  ownerId?: string;
  limit: number;
}

export interface OpportunityRepository {
  findById(tenantId: string, id: string): Promise<Opportunity | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListOpportunitiesFilter): Promise<Opportunity[]>;
  /** Every OPEN opportunity in a pipeline — the raw material `GetPipelineSummaryUseCase` sums per stage, always freshly, never a stored total. */
  listOpenByPipeline(tenantId: string, pipelineId: string): Promise<Opportunity[]>;
  save(opportunity: Opportunity): Promise<void>;
}

export const OPPORTUNITY_REPOSITORY = Symbol("OPPORTUNITY_REPOSITORY");
