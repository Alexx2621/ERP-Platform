import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { PipelineStage } from "../../domain/pipeline-stage.entity";
import { PIPELINE_REPOSITORY, PipelineRepository } from "../../domain/pipeline.repository";
import { PIPELINE_STAGE_REPOSITORY, PipelineStageRepository } from "../../domain/pipeline-stage.repository";
import { PipelineNotFoundError } from "../errors";

export interface AddPipelineStageInput {
  tenantId: string;
  companyId: string;
  pipelineId: string;
  name: string;
  isWon?: boolean;
  isLost?: boolean;
}

/** Always appends at the end (`sortOrder` = current stage count) — see the domain entity's own docstring for why reordering is out of scope. */
@Injectable()
export class AddPipelineStageUseCase {
  constructor(
    @Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository,
    @Inject(PIPELINE_STAGE_REPOSITORY) private readonly stages: PipelineStageRepository,
  ) {}

  async execute(input: AddPipelineStageInput): Promise<PipelineStage> {
    const pipeline = await this.pipelines.findById(input.tenantId, input.pipelineId);
    if (!pipeline || pipeline.companyId !== input.companyId) {
      throw new PipelineNotFoundError();
    }

    const existingStages = await this.stages.listByPipeline(input.tenantId, pipeline.id);
    const now = new Date();
    const stage = PipelineStage.create({
      id: newId(),
      tenantId: input.tenantId,
      pipelineId: pipeline.id,
      name: input.name,
      sortOrder: existingStages.length,
      isWon: input.isWon ?? false,
      isLost: input.isLost ?? false,
      createdAt: now,
      updatedAt: now,
    });
    await this.stages.save(stage);
    return stage;
  }
}
