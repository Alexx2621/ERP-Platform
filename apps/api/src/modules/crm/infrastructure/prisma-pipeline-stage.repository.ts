import { Injectable } from "@nestjs/common";
import type { PipelineStage as PrismaPipelineStage } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PipelineStage } from "../domain/pipeline-stage.entity";
import { PipelineStageRepository } from "../domain/pipeline-stage.repository";

@Injectable()
export class PrismaPipelineStageRepository implements PipelineStageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<PipelineStage | null> {
    const record = await this.prisma.pipelineStage.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async listByPipeline(tenantId: string, pipelineId: string): Promise<PipelineStage[]> {
    const records = await this.prisma.pipelineStage.findMany({
      where: { tenantId, pipelineId },
      orderBy: { sortOrder: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(stage: PipelineStage): Promise<void> {
    const props = stage.toProps();
    await this.prisma.pipelineStage.upsert({ where: { id: props.id }, create: props, update: {} });
  }

  private toDomain(record: PrismaPipelineStage): PipelineStage {
    return PipelineStage.create({
      id: record.id,
      tenantId: record.tenantId,
      pipelineId: record.pipelineId,
      name: record.name,
      sortOrder: record.sortOrder,
      isWon: record.isWon,
      isLost: record.isLost,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
