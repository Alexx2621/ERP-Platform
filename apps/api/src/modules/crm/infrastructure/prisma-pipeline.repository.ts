import { Injectable } from "@nestjs/common";
import type { Pipeline as PrismaPipeline } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Pipeline } from "../domain/pipeline.entity";
import { PipelineRepository } from "../domain/pipeline.repository";

@Injectable()
export class PrismaPipelineRepository implements PipelineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Pipeline | null> {
    const record = await this.prisma.pipeline.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<Pipeline | null> {
    const record = await this.prisma.pipeline.findUnique({
      where: { tenantId_companyId_code: { tenantId, companyId, code } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string): Promise<Pipeline[]> {
    const records = await this.prisma.pipeline.findMany({ where: { tenantId, companyId }, orderBy: { code: "asc" } });
    return records.map((record) => this.toDomain(record));
  }

  async save(pipeline: Pipeline): Promise<void> {
    const props = pipeline.toProps();
    await this.prisma.pipeline.upsert({
      where: { id: props.id },
      create: props,
      update: { name: props.name, status: props.status, version: props.version },
    });
  }

  private toDomain(record: PrismaPipeline): Pipeline {
    return Pipeline.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      code: record.code,
      name: record.name,
      status: record.status,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
