import { Injectable } from "@nestjs/common";
import type { PurchaseReceipt as PrismaPurchaseReceipt } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PurchaseReceipt } from "../domain/purchase-receipt.entity";
import { ListPurchaseReceiptsFilter, PurchaseReceiptRepository } from "../domain/purchase-receipt.repository";

@Injectable()
export class PrismaPurchaseReceiptRepository implements PurchaseReceiptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<PurchaseReceipt | null> {
    const record = await this.prisma.purchaseReceipt.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListPurchaseReceiptsFilter,
  ): Promise<PurchaseReceipt[]> {
    const records = await this.prisma.purchaseReceipt.findMany({
      where: { tenantId, companyId, purchaseOrderId: filter.purchaseOrderId },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async listByPurchaseOrder(tenantId: string, purchaseOrderId: string): Promise<PurchaseReceipt[]> {
    const records = await this.prisma.purchaseReceipt.findMany({ where: { tenantId, purchaseOrderId } });
    return records.map((record) => this.toDomain(record));
  }

  async save(receipt: PurchaseReceipt): Promise<void> {
    const props = receipt.toProps();
    await this.prisma.purchaseReceipt.upsert({
      where: { tenantId_id: { tenantId: props.tenantId, id: props.id } },
      create: props,
      update: {},
    });
  }

  private toDomain(record: PrismaPurchaseReceipt): PurchaseReceipt {
    return PurchaseReceipt.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      purchaseOrderId: record.purchaseOrderId,
      notes: record.notes,
      createdAt: record.createdAt,
    });
  }
}
