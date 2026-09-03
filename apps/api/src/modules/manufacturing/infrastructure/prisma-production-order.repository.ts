import { Injectable } from "@nestjs/common";
import type { ProductionOrder as PrismaProductionOrder } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { ProductionOrder } from "../domain/production-order.entity";
import { ListProductionOrdersFilter, ProductionOrderRepository } from "../domain/production-order.repository";

@Injectable()
export class PrismaProductionOrderRepository implements ProductionOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<ProductionOrder | null> {
    const record = await this.prisma.productionOrder.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListProductionOrdersFilter,
  ): Promise<ProductionOrder[]> {
    const records = await this.prisma.productionOrder.findMany({
      where: {
        tenantId,
        companyId,
        status: filter.status as never,
        billOfMaterialId: filter.billOfMaterialId,
      },
      orderBy: { createdAt: "desc" },
      take: filter.limit ?? 50,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(order: ProductionOrder): Promise<void> {
    const props = order.toProps();
    await this.prisma.productionOrder.upsert({
      where: { id: props.id },
      create: props,
      update: {
        status: props.status,
        version: props.version,
        updatedAt: props.updatedAt,
        confirmedAt: props.confirmedAt,
        closedAt: props.closedAt,
        cancelledAt: props.cancelledAt,
      },
    });
  }

  private toDomain(record: PrismaProductionOrder): ProductionOrder {
    return ProductionOrder.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      billOfMaterialId: record.billOfMaterialId,
      productId: record.productId,
      warehouseId: record.warehouseId,
      quantityPlanned: record.quantityPlanned.toFixed(4),
      status: record.status,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      confirmedAt: record.confirmedAt,
      closedAt: record.closedAt,
      cancelledAt: record.cancelledAt,
    });
  }
}
