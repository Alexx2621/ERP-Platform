import { PipelineStage } from "./pipeline-stage.entity";

export interface PipelineStageRepository {
  findById(tenantId: string, id: string): Promise<PipelineStage | null>;
  listByPipeline(tenantId: string, pipelineId: string): Promise<PipelineStage[]>;
  save(stage: PipelineStage): Promise<void>;
}

export const PIPELINE_STAGE_REPOSITORY = Symbol("PIPELINE_STAGE_REPOSITORY");
