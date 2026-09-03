import { Inject, Injectable } from "@nestjs/common";
import { PipelineStage } from "../../domain/pipeline-stage.entity";
import { PIPELINE_REPOSITORY, PipelineRepository } from "../../domain/pipeline.repository";
import { PIPELINE_STAGE_REPOSITORY, PipelineStageRepository } from "../../domain/pipeline-stage.repository";
import { PipelineNotFoundError } from "../errors";

@Injectable()
export class ListPipelineStagesUseCase {
  constructor(
    @Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository,
    @Inject(PIPELINE_STAGE_REPOSITORY) private readonly stages: PipelineStageRepository,
  ) {}

  async execute(tenantId: string, companyId: string, pipelineId: string): Promise<PipelineStage[]> {
    const pipeline = await this.pipelines.findById(tenantId, pipelineId);
    if (!pipeline || pipeline.companyId !== companyId) {
      throw new PipelineNotFoundError();
    }
    const stages = await this.stages.listByPipeline(tenantId, pipeline.id);
    return [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
  }
}
