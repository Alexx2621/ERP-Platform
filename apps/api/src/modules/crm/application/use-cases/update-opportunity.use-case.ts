import { Inject, Injectable } from "@nestjs/common";
import { Opportunity } from "../../domain/opportunity.entity";
import { OPPORTUNITY_REPOSITORY, OpportunityRepository } from "../../domain/opportunity.repository";
import { OpportunityNotFoundError, OpportunityNotOpenError } from "../errors";

export interface UpdateOpportunityInput {
  tenantId: string;
  companyId: string;
  id: string;
  name: string;
  amount: string;
  expectedCloseDate?: string;
}

/** Only an `OPEN` opportunity can be edited — a closed (`WON`/`LOST`) deal's own final amount/date is a historical fact, the same "closed is terminal" reasoning `moveToStage()` already enforces. */
@Injectable()
export class UpdateOpportunityUseCase {
  constructor(@Inject(OPPORTUNITY_REPOSITORY) private readonly opportunities: OpportunityRepository) {}

  async execute(input: UpdateOpportunityInput): Promise<Opportunity> {
    const opportunity = await this.opportunities.findById(input.tenantId, input.id);
    if (!opportunity || opportunity.companyId !== input.companyId) {
      throw new OpportunityNotFoundError();
    }
    if (opportunity.status !== "OPEN") {
      throw new OpportunityNotOpenError(opportunity.status);
    }
    opportunity.update({
      name: input.name,
      amount: input.amount,
      expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
    });
    await this.opportunities.save(opportunity);
    return opportunity;
  }
}
