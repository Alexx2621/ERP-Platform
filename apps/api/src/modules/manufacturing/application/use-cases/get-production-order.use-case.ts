import { Inject, Injectable } from "@nestjs/common";
import { addDecimal } from "../../domain/decimal";
import { ProductionOrder } from "../../domain/production-order.entity";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "../../domain/production-order.repository";
import {
  PRODUCTION_ORDER_FINISHED_GOODS_RECEIPT_REPOSITORY,
  ProductionOrderFinishedGoodsReceiptRepository,
} from "../../domain/production-order-finished-goods-receipt.repository";
import { ProductionOrderNotFoundError } from "../errors";

export interface GetProductionOrderInput {
  tenantId: string;
  companyId: string;
  productionOrderId: string;
}

export interface GetProductionOrderResult {
  order: ProductionOrder;
  /** Summed fresh from `ProductionOrderFinishedGoodsReceipt` on every call — never a stored column (see `ProductionOrder`'s own docstring). */
  quantityCompleted: string;
}

@Injectable()
export class GetProductionOrderUseCase {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY) private readonly productionOrders: ProductionOrderRepository,
    @Inject(PRODUCTION_ORDER_FINISHED_GOODS_RECEIPT_REPOSITORY)
    private readonly receipts: ProductionOrderFinishedGoodsReceiptRepository,
  ) {}

  async execute(input: GetProductionOrderInput): Promise<GetProductionOrderResult> {
    const order = await this.productionOrders.findById(input.tenantId, input.productionOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new ProductionOrderNotFoundError();
    }
    const receipts = await this.receipts.listByProductionOrder(input.tenantId, order.id);
    const quantityCompleted = receipts.reduce((sum, receipt) => addDecimal(sum, receipt.quantity), "0.0000");
    return { order, quantityCompleted };
  }
}
