import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { Pipeline } from "../../domain/pipeline.entity";
import { PIPELINE_REPOSITORY, PipelineRepository } from "../../domain/pipeline.repository";
import { PipelineCodeAlreadyInUseError } from "../errors";

export interface CreatePipelineInput {
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
}

@Injectable()
export class CreatePipelineUseCase {
  constructor(@Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository) {}

  async execute(input: CreatePipelineInput): Promise<Pipeline> {
    const code = input.code.trim();
    const existing = await this.pipelines.findByCode(input.tenantId, input.companyId, code);
    if (existing) {
      throw new PipelineCodeAlreadyInUseError(code);
    }

    const now = new Date();
    const pipeline = Pipeline.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      code,
      name: input.name,
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.pipelines.save(pipeline);
    return pipeline;
  }
}
