import { Injectable } from "@nestjs/common";
import type { PurchaseOrder as PrismaPurchaseOrder } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PurchaseOrder } from "../domain/purchase-order.entity";
import { ListPurchaseOrdersFilter, PurchaseOrderRepository } from "../domain/purchase-order.repository";

@Injectable()
export class PrismaPurchaseOrderRepository implements PurchaseOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<PurchaseOrder | null> {
    const record = await this.prisma.purchaseOrder.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListPurchaseOrdersFilter,
  ): Promise<PurchaseOrder[]> {
    const records = await this.prisma.purchaseOrder.findMany({
      where: { tenantId, companyId, status: filter.status, supplierId: filter.supplierId },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(order: PurchaseOrder): Promise<void> {
    const props = order.toProps();
    await this.prisma.purchaseOrder.upsert({
      where: { tenantId_id: { tenantId: props.tenantId, id: props.id } },
      create: props,
      update: {
        status: props.status,
        version: props.version,
        confirmedAt: props.confirmedAt,
        closedAt: props.closedAt,
        cancelledAt: props.cancelledAt,
      },
    });
  }

  private toDomain(record: PrismaPurchaseOrder): PurchaseOrder {
    return PurchaseOrder.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      supplierId: record.supplierId,
      status: record.status,
      currency: record.currency,
      notes: record.notes,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      confirmedAt: record.confirmedAt,
      closedAt: record.closedAt,
      cancelledAt: record.cancelledAt,
    });
  }
}
