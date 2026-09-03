import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { RecordReceiptUseCase } from "../../../inventory";
import { addDecimal, isNegativeDecimal, subtractDecimal } from "../../domain/decimal";
import { ProductionOrderFinishedGoodsReceipt } from "../../domain/production-order-finished-goods-receipt.entity";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "../../domain/production-order.repository";
import {
  PRODUCTION_ORDER_FINISHED_GOODS_RECEIPT_REPOSITORY,
  ProductionOrderFinishedGoodsReceiptRepository,
} from "../../domain/production-order-finished-goods-receipt.repository";
import {
  ProductionOrderFinishedGoodsReceiptExceedsPlannedQuantityError,
  ProductionOrderNotConfirmedError,
  ProductionOrderNotFoundError,
} from "../errors";

export interface RecordFinishedGoodsInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  productionOrderId: string;
  quantity: string;
}

/**
 * The "finished goods" `docs/ROADMAP.md` §14 requires — genuinely partial
 * across multiple calls, validated against `quantityPlanned` minus the
 * running sum of prior receipts (same "recepción parcial" pattern
 * `CreatePurchaseReceiptUseCase` already established). Posts a real
 * `RecordReceiptUseCase` call (`referenceType: "PRODUCTION_ORDER"`) for
 * the order's own finished-good `productId` — no variant, since a BOM's
 * finished good is a plain, non-variant `Product` in this slice (see
 * `CreateBillOfMaterialUseCase`).
 */
@Injectable()
export class RecordFinishedGoodsUseCase {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY) private readonly productionOrders: ProductionOrderRepository,
    @Inject(PRODUCTION_ORDER_FINISHED_GOODS_RECEIPT_REPOSITORY)
    private readonly receipts: ProductionOrderFinishedGoodsReceiptRepository,
    private readonly recordReceipt: RecordReceiptUseCase,
  ) {}

  async execute(input: RecordFinishedGoodsInput): Promise<ProductionOrderFinishedGoodsReceipt> {
    const order = await this.productionOrders.findById(input.tenantId, input.productionOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new ProductionOrderNotFoundError();
    }
    if (order.status !== "CONFIRMED") {
      throw new ProductionOrderNotConfirmedError();
    }

    const priorReceipts = await this.receipts.listByProductionOrder(input.tenantId, order.id);
    const alreadyReceived = priorReceipts.reduce((sum, prior) => addDecimal(sum, prior.quantity), "0.0000");

    const now = new Date();
    const receipt = ProductionOrderFinishedGoodsReceipt.create({
      id: newId(),
      tenantId: input.tenantId,
      productionOrderId: order.id,
      quantity: input.quantity,
      createdAt: now,
    });
    const remaining = subtractDecimal(order.quantityPlanned, addDecimal(alreadyReceived, receipt.quantity));
    if (isNegativeDecimal(remaining)) {
      throw new ProductionOrderFinishedGoodsReceiptExceedsPlannedQuantityError();
    }

    await this.recordReceipt.execute({
      tenantId: input.tenantId,
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      warehouseId: order.warehouseId,
      productId: order.productId,
      productVariantId: null,
      quantity: receipt.quantity,
      referenceType: "PRODUCTION_ORDER",
      referenceId: order.id,
    });

    await this.receipts.save(receipt);
    return receipt;
  }
}
