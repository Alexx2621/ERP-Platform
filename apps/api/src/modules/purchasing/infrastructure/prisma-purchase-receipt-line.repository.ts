import { Injectable } from "@nestjs/common";
import type { PurchaseReceiptLine as PrismaPurchaseReceiptLine } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PurchaseReceiptLine } from "../domain/purchase-receipt-line.entity";
import { PurchaseReceiptLineRepository } from "../domain/purchase-receipt-line.repository";

@Injectable()
export class PrismaPurchaseReceiptLineRepository implements PurchaseReceiptLineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByPurchaseReceipt(tenantId: string, purchaseReceiptId: string): Promise<PurchaseReceiptLine[]> {
    const records = await this.prisma.purchaseReceiptLine.findMany({
      where: { tenantId, purchaseReceiptId },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async listByPurchaseOrderLine(tenantId: string, purchaseOrderLineId: string): Promise<PurchaseReceiptLine[]> {
    const records = await this.prisma.purchaseReceiptLine.findMany({
      where: { tenantId, purchaseOrderLineId },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(line: PurchaseReceiptLine): Promise<void> {
    const props = line.toProps();
    await this.prisma.purchaseReceiptLine.upsert({
      where: { id: props.id },
      create: props,
      update: {},
    });
  }

  private toDomain(record: PrismaPurchaseReceiptLine): PurchaseReceiptLine {
    return PurchaseReceiptLine.create({
      id: record.id,
      tenantId: record.tenantId,
      purchaseReceiptId: record.purchaseReceiptId,
      purchaseOrderLineId: record.purchaseOrderLineId,
      quantity: record.quantity.toFixed(4),
      createdAt: record.createdAt,
    });
  }
}
