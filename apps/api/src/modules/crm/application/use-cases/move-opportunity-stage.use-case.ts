import { Inject, Injectable } from "@nestjs/common";
import { Opportunity } from "../../domain/opportunity.entity";
import { OPPORTUNITY_REPOSITORY, OpportunityRepository } from "../../domain/opportunity.repository";
import { PIPELINE_STAGE_REPOSITORY, PipelineStageRepository } from "../../domain/pipeline-stage.repository";
import { OpportunityNotFoundError, OpportunityNotOpenError, PipelineStageNotFoundError } from "../errors";

export interface MoveOpportunityStageInput {
  tenantId: string;
  companyId: string;
  id: string;
  stageId: string;
}

/** Moving onto a stage flagged `isWon`/`isLost` closes the opportunity in the same step — the stage itself is what declares the outcome, never a separate caller-supplied status. */
@Injectable()
export class MoveOpportunityStageUseCase {
  constructor(
    @Inject(OPPORTUNITY_REPOSITORY) private readonly opportunities: OpportunityRepository,
    @Inject(PIPELINE_STAGE_REPOSITORY) private readonly stages: PipelineStageRepository,
  ) {}

  async execute(input: MoveOpportunityStageInput): Promise<Opportunity> {
    const opportunity = await this.opportunities.findById(input.tenantId, input.id);
    if (!opportunity || opportunity.companyId !== input.companyId) {
      throw new OpportunityNotFoundError();
    }
    if (opportunity.status !== "OPEN") {
      throw new OpportunityNotOpenError(opportunity.status);
    }

    const stage = await this.stages.findById(input.tenantId, input.stageId);
    if (!stage || stage.pipelineId !== opportunity.pipelineId) {
      throw new PipelineStageNotFoundError();
    }

    const closingOutcome = stage.isWon ? "WON" : stage.isLost ? "LOST" : null;
    opportunity.moveToStage(stage.id, closingOutcome, new Date());
    await this.opportunities.save(opportunity);
    return opportunity;
  }
}
