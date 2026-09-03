import { Pipeline } from "./pipeline.entity";

export interface PipelineRepository {
  findById(tenantId: string, id: string): Promise<Pipeline | null>;
  findByCode(tenantId: string, companyId: string, code: string): Promise<Pipeline | null>;
  listByCompany(tenantId: string, companyId: string): Promise<Pipeline[]>;
  save(pipeline: Pipeline): Promise<void>;
}

export const PIPELINE_REPOSITORY = Symbol("PIPELINE_REPOSITORY");
