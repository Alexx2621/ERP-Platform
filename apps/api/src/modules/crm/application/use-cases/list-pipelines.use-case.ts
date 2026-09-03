import { Inject, Injectable } from "@nestjs/common";
import { Pipeline } from "../../domain/pipeline.entity";
import { PIPELINE_REPOSITORY, PipelineRepository } from "../../domain/pipeline.repository";

@Injectable()
export class ListPipelinesUseCase {
  constructor(@Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository) {}

  async execute(tenantId: string, companyId: string): Promise<Pipeline[]> {
    return this.pipelines.listByCompany(tenantId, companyId);
  }
}
