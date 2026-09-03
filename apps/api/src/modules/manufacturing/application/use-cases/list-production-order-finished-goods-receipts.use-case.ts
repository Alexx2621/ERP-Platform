import { Inject, Injectable } from "@nestjs/common";
import { ProductionOrderFinishedGoodsReceipt } from "../../domain/production-order-finished-goods-receipt.entity";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "../../domain/production-order.repository";
import {
  PRODUCTION_ORDER_FINISHED_GOODS_RECEIPT_REPOSITORY,
  ProductionOrderFinishedGoodsReceiptRepository,
} from "../../domain/production-order-finished-goods-receipt.repository";
import { ProductionOrderNotFoundError } from "../errors";

export interface ListProductionOrderFinishedGoodsReceiptsInput {
  tenantId: string;
  companyId: string;
  productionOrderId: string;
}

@Injectable()
export class ListProductionOrderFinishedGoodsReceiptsUseCase {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY) private readonly productionOrders: ProductionOrderRepository,
    @Inject(PRODUCTION_ORDER_FINISHED_GOODS_RECEIPT_REPOSITORY)
    private readonly receipts: ProductionOrderFinishedGoodsReceiptRepository,
  ) {}

  async execute(input: ListProductionOrderFinishedGoodsReceiptsInput): Promise<ProductionOrderFinishedGoodsReceipt[]> {
    const order = await this.productionOrders.findById(input.tenantId, input.productionOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new ProductionOrderNotFoundError();
    }
    return this.receipts.listByProductionOrder(input.tenantId, order.id);
  }
}
