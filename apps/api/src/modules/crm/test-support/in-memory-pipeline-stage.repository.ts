import { PipelineStage } from "../domain/pipeline-stage.entity";
import { PipelineStageRepository } from "../domain/pipeline-stage.repository";

export class InMemoryPipelineStageRepository implements PipelineStageRepository {
  private readonly byId = new Map<string, PipelineStage>();

  async findById(tenantId: string, id: string): Promise<PipelineStage | null> {
    const stage = this.byId.get(id);
    return stage && stage.tenantId === tenantId ? stage : null;
  }

  async listByPipeline(tenantId: string, pipelineId: string): Promise<PipelineStage[]> {
    return [...this.byId.values()].filter((s) => s.tenantId === tenantId && s.pipelineId === pipelineId);
  }

  async save(stage: PipelineStage): Promise<void> {
    this.byId.set(stage.id, stage);
  }
}
