import { Injectable } from "@nestjs/common";
import type { PurchaseReturn as PrismaPurchaseReturn } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PurchaseReturn } from "../domain/purchase-return.entity";
import { ListPurchaseReturnsFilter, PurchaseReturnRepository } from "../domain/purchase-return.repository";

@Injectable()
export class PrismaPurchaseReturnRepository implements PurchaseReturnRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<PurchaseReturn | null> {
    const record = await this.prisma.purchaseReturn.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListPurchaseReturnsFilter,
  ): Promise<PurchaseReturn[]> {
    const records = await this.prisma.purchaseReturn.findMany({
      where: { tenantId, companyId, purchaseOrderId: filter.purchaseOrderId },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(purchaseReturn: PurchaseReturn): Promise<void> {
    const props = purchaseReturn.toProps();
    await this.prisma.purchaseReturn.upsert({
      where: { tenantId_id: { tenantId: props.tenantId, id: props.id } },
      create: props,
      update: {},
    });
  }

  private toDomain(record: PrismaPurchaseReturn): PurchaseReturn {
    return PurchaseReturn.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      purchaseOrderId: record.purchaseOrderId,
      reason: record.reason,
      createdAt: record.createdAt,
    });
  }
}
