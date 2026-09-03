import { Inject, Injectable } from "@nestjs/common";
import { addDecimal } from "../../domain/decimal";
import { PIPELINE_REPOSITORY, PipelineRepository } from "../../domain/pipeline.repository";
import { PIPELINE_STAGE_REPOSITORY, PipelineStageRepository } from "../../domain/pipeline-stage.repository";
import { OPPORTUNITY_REPOSITORY, OpportunityRepository } from "../../domain/opportunity.repository";
import { PipelineNotFoundError } from "../errors";

export interface PipelineStageSummaryRow {
  stageId: string;
  stageName: string;
  sortOrder: number;
  openCount: number;
  openAmountTotal: string;
}

export interface PipelineSummaryResult {
  pipelineId: string;
  pipelineName: string;
  rows: PipelineStageSummaryRow[];
  totalOpenAmount: string;
}

/**
 * How much open value sits in each stage of a pipeline, summed fresh from
 * every real `OPEN` `Opportunity` on every call — never a stored total,
 * the same "ledger read, never a drifting counter" philosophy
 * `InventoryBalance`/`GetTrialBalanceUseCase` already established.
 * **Known limitation**: sums `amount` across opportunities regardless of
 * `currency` — this codebase has no FX/multi-currency aggregation
 * anywhere yet (Sales/Purchasing orders carry a `currency` field with the
 * same gap), so a pipeline mixing currencies gets a numerically real but
 * not meaningfully comparable total; proportionate for this slice.
 */
@Injectable()
export class GetPipelineSummaryUseCase {
  constructor(
    @Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository,
    @Inject(PIPELINE_STAGE_REPOSITORY) private readonly stages: PipelineStageRepository,
    @Inject(OPPORTUNITY_REPOSITORY) private readonly opportunities: OpportunityRepository,
  ) {}

  async execute(tenantId: string, companyId: string, pipelineId: string): Promise<PipelineSummaryResult> {
    const pipeline = await this.pipelines.findById(tenantId, pipelineId);
    if (!pipeline || pipeline.companyId !== companyId) {
      throw new PipelineNotFoundError();
    }

    const stages = await this.stages.listByPipeline(tenantId, pipeline.id);
    const openOpportunities = await this.opportunities.listOpenByPipeline(tenantId, pipeline.id);

    const rows: PipelineStageSummaryRow[] = [...stages]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((stage) => {
        const inStage = openOpportunities.filter((o) => o.stageId === stage.id);
        return {
          stageId: stage.id,
          stageName: stage.name,
          sortOrder: stage.sortOrder,
          openCount: inStage.length,
          openAmountTotal: inStage.reduce((sum, o) => addDecimal(sum, o.amount), "0.0000"),
        };
      });

    return {
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      rows,
      totalOpenAmount: rows.reduce((sum, row) => addDecimal(sum, row.openAmountTotal), "0.0000"),
    };
  }
}
