import { Inject, Injectable } from "@nestjs/common";
import { Opportunity } from "../../domain/opportunity.entity";
import { OPPORTUNITY_REPOSITORY, OpportunityRepository, ListOpportunitiesFilter } from "../../domain/opportunity.repository";

export interface ListOpportunitiesInput {
  tenantId: string;
  companyId: string;
  filter: ListOpportunitiesFilter;
}

@Injectable()
export class ListOpportunitiesUseCase {
  constructor(@Inject(OPPORTUNITY_REPOSITORY) private readonly opportunities: OpportunityRepository) {}

  async execute(input: ListOpportunitiesInput): Promise<Opportunity[]> {
    return this.opportunities.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
