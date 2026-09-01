import { Injectable } from "@nestjs/common";
import type { PurchaseOrderLine as PrismaPurchaseOrderLine } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PurchaseOrderLine } from "../domain/purchase-order-line.entity";
import { PurchaseOrderLineRepository } from "../domain/purchase-order-line.repository";

@Injectable()
export class PrismaPurchaseOrderLineRepository implements PurchaseOrderLineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<PurchaseOrderLine | null> {
    const record = await this.prisma.purchaseOrderLine.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async listByPurchaseOrder(tenantId: string, purchaseOrderId: string): Promise<PurchaseOrderLine[]> {
    const records = await this.prisma.purchaseOrderLine.findMany({
      where: { tenantId, purchaseOrderId },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(line: PurchaseOrderLine): Promise<void> {
    const props = line.toProps();
    await this.prisma.purchaseOrderLine.upsert({
      where: { id: props.id },
      create: props,
      update: {},
    });
  }

  private toDomain(record: PrismaPurchaseOrderLine): PurchaseOrderLine {
    return PurchaseOrderLine.fromProps({
      id: record.id,
      tenantId: record.tenantId,
      purchaseOrderId: record.purchaseOrderId,
      warehouseId: record.warehouseId,
      productId: record.productId,
      productVariantId: record.productVariantId,
      quantity: record.quantity.toFixed(4),
      unitCost: record.unitCost.toFixed(4),
      lineTotal: record.lineTotal.toFixed(4),
      createdAt: record.createdAt,
    });
  }
}
