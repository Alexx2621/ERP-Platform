import { Inject, Injectable } from "@nestjs/common";
import { Opportunity } from "../../domain/opportunity.entity";
import { OPPORTUNITY_REPOSITORY, OpportunityRepository } from "../../domain/opportunity.repository";
import { OpportunityNotFoundError } from "../errors";

@Injectable()
export class GetOpportunityUseCase {
  constructor(@Inject(OPPORTUNITY_REPOSITORY) private readonly opportunities: OpportunityRepository) {}

  async execute(tenantId: string, companyId: string, id: string): Promise<Opportunity> {
    const opportunity = await this.opportunities.findById(tenantId, id);
    if (!opportunity || opportunity.companyId !== companyId) {
      throw new OpportunityNotFoundError();
    }
    return opportunity;
  }
}
