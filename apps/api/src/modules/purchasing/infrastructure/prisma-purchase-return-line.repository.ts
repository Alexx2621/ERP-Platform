import { Injectable } from "@nestjs/common";
import type { PurchaseReturnLine as PrismaPurchaseReturnLine } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PurchaseReturnLine } from "../domain/purchase-return-line.entity";
import { PurchaseReturnLineRepository } from "../domain/purchase-return-line.repository";

@Injectable()
export class PrismaPurchaseReturnLineRepository implements PurchaseReturnLineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByPurchaseReturn(tenantId: string, purchaseReturnId: string): Promise<PurchaseReturnLine[]> {
    const records = await this.prisma.purchaseReturnLine.findMany({
      where: { tenantId, purchaseReturnId },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async listByPurchaseOrderLine(tenantId: string, purchaseOrderLineId: string): Promise<PurchaseReturnLine[]> {
    const records = await this.prisma.purchaseReturnLine.findMany({
      where: { tenantId, purchaseOrderLineId },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(line: PurchaseReturnLine): Promise<void> {
    const props = line.toProps();
    await this.prisma.purchaseReturnLine.upsert({
      where: { id: props.id },
      create: props,
      update: {},
    });
  }

  private toDomain(record: PrismaPurchaseReturnLine): PurchaseReturnLine {
    return PurchaseReturnLine.create({
      id: record.id,
      tenantId: record.tenantId,
      purchaseReturnId: record.purchaseReturnId,
      purchaseOrderLineId: record.purchaseOrderLineId,
      quantity: record.quantity.toFixed(4),
      createdAt: record.createdAt,
    });
  }
}
