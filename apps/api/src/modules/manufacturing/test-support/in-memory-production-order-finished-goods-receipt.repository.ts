import { ProductionOrderFinishedGoodsReceipt } from "../domain/production-order-finished-goods-receipt.entity";
import { ProductionOrderFinishedGoodsReceiptRepository } from "../domain/production-order-finished-goods-receipt.repository";

export class InMemoryProductionOrderFinishedGoodsReceiptRepository
  implements ProductionOrderFinishedGoodsReceiptRepository
{
  private readonly byId = new Map<string, ProductionOrderFinishedGoodsReceipt>();

  async listByProductionOrder(
    tenantId: string,
    productionOrderId: string,
  ): Promise<ProductionOrderFinishedGoodsReceipt[]> {
    return [...this.byId.values()]
      .filter((r) => r.tenantId === tenantId && r.productionOrderId === productionOrderId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async save(receipt: ProductionOrderFinishedGoodsReceipt): Promise<void> {
    this.byId.set(receipt.id, receipt);
  }
}
