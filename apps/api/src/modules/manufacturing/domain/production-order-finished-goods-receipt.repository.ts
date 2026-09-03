import { ProductionOrderFinishedGoodsReceipt } from "./production-order-finished-goods-receipt.entity";

export interface ProductionOrderFinishedGoodsReceiptRepository {
  listByProductionOrder(tenantId: string, productionOrderId: string): Promise<ProductionOrderFinishedGoodsReceipt[]>;
  save(receipt: ProductionOrderFinishedGoodsReceipt): Promise<void>;
}

export const PRODUCTION_ORDER_FINISHED_GOODS_RECEIPT_REPOSITORY = Symbol(
  "PRODUCTION_ORDER_FINISHED_GOODS_RECEIPT_REPOSITORY",
);
