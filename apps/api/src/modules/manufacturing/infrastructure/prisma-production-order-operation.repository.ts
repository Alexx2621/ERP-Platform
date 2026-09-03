import { Injectable } from "@nestjs/common";
import type { ProductionOrderOperation as PrismaProductionOrderOperation } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { ProductionOrderOperation } from "../domain/production-order-operation.entity";
import { ProductionOrderOperationRepository } from "../domain/production-order-operation.repository";

@Injectable()
export class PrismaProductionOrderOperationRepository implements ProductionOrderOperationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<ProductionOrderOperation | null> {
    const record = await this.prisma.productionOrderOperation.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async listByProductionOrder(tenantId: string, productionOrderId: string): Promise<ProductionOrderOperation[]> {
    const records = await this.prisma.productionOrderOperation.findMany({
      where: { tenantId, productionOrderId },
      orderBy: { sortOrder: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(operation: ProductionOrderOperation): Promise<void> {
    const props = operation.toProps();
    await this.prisma.productionOrderOperation.upsert({
      where: { id: props.id },
      create: props,
      update: { completedAt: props.completedAt },
    });
  }

  private toDomain(record: PrismaProductionOrderOperation): ProductionOrderOperation {
    return ProductionOrderOperation.create({
      id: record.id,
      tenantId: record.tenantId,
      productionOrderId: record.productionOrderId,
      name: record.name,
      sortOrder: record.sortOrder,
      completedAt: record.completedAt,
      createdAt: record.createdAt,
    });
  }
}
