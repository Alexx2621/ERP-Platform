import { Pipeline } from "../domain/pipeline.entity";
import { PipelineRepository } from "../domain/pipeline.repository";

export class InMemoryPipelineRepository implements PipelineRepository {
  private readonly byId = new Map<string, Pipeline>();

  async findById(tenantId: string, id: string): Promise<Pipeline | null> {
    const pipeline = this.byId.get(id);
    return pipeline && pipeline.tenantId === tenantId ? pipeline : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<Pipeline | null> {
    return (
      [...this.byId.values()].find((p) => p.tenantId === tenantId && p.companyId === companyId && p.code === code) ?? null
    );
  }

  async listByCompany(tenantId: string, companyId: string): Promise<Pipeline[]> {
    return [...this.byId.values()].filter((p) => p.tenantId === tenantId && p.companyId === companyId);
  }

  async save(pipeline: Pipeline): Promise<void> {
    this.byId.set(pipeline.id, pipeline);
  }
}
