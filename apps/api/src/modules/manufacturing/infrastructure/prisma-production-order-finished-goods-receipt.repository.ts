import { Injectable } from "@nestjs/common";
import type { ProductionOrderFinishedGoodsReceipt as PrismaProductionOrderFinishedGoodsReceipt } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { ProductionOrderFinishedGoodsReceipt } from "../domain/production-order-finished-goods-receipt.entity";
import { ProductionOrderFinishedGoodsReceiptRepository } from "../domain/production-order-finished-goods-receipt.repository";

@Injectable()
export class PrismaProductionOrderFinishedGoodsReceiptRepository
  implements ProductionOrderFinishedGoodsReceiptRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async listByProductionOrder(
    tenantId: string,
    productionOrderId: string,
  ): Promise<ProductionOrderFinishedGoodsReceipt[]> {
    const records = await this.prisma.productionOrderFinishedGoodsReceipt.findMany({
      where: { tenantId, productionOrderId },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(receipt: ProductionOrderFinishedGoodsReceipt): Promise<void> {
    const props = receipt.toProps();
    await this.prisma.productionOrderFinishedGoodsReceipt.upsert({
      where: { id: props.id },
      create: props,
      update: {},
    });
  }

  private toDomain(record: PrismaProductionOrderFinishedGoodsReceipt): ProductionOrderFinishedGoodsReceipt {
    return ProductionOrderFinishedGoodsReceipt.create({
      id: record.id,
      tenantId: record.tenantId,
      productionOrderId: record.productionOrderId,
      quantity: record.quantity.toFixed(4),
      createdAt: record.createdAt,
    });
  }
}
