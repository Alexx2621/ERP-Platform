import { Inject, Injectable } from "@nestjs/common";
import { MasterDataStatus, Pipeline } from "../../domain/pipeline.entity";
import { PIPELINE_REPOSITORY, PipelineRepository } from "../../domain/pipeline.repository";
import { PipelineNotFoundError } from "../errors";

export interface SetPipelineStatusInput {
  tenantId: string;
  companyId: string;
  id: string;
  status: MasterDataStatus;
}

@Injectable()
export class SetPipelineStatusUseCase {
  constructor(@Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository) {}

  async execute(input: SetPipelineStatusInput): Promise<Pipeline> {
    const pipeline = await this.pipelines.findById(input.tenantId, input.id);
    if (!pipeline || pipeline.companyId !== input.companyId) {
      throw new PipelineNotFoundError();
    }
    pipeline.setStatus(input.status);
    await this.pipelines.save(pipeline);
    return pipeline;
  }
}
