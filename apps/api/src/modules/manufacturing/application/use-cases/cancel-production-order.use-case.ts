import { Inject, Injectable } from "@nestjs/common";
import { ProductionOrder } from "../../domain/production-order.entity";
import { PRODUCTION_ORDER_REPOSITORY, ProductionOrderRepository } from "../../domain/production-order.repository";
import {
  PRODUCTION_ORDER_MATERIAL_REPOSITORY,
  ProductionOrderMaterialRepository,
} from "../../domain/production-order-material.repository";
import {
  PRODUCTION_ORDER_MATERIAL_MOVEMENT_REPOSITORY,
  ProductionOrderMaterialMovementRepository,
} from "../../domain/production-order-material-movement.repository";
import {
  PRODUCTION_ORDER_FINISHED_GOODS_RECEIPT_REPOSITORY,
  ProductionOrderFinishedGoodsReceiptRepository,
} from "../../domain/production-order-finished-goods-receipt.repository";
import { ProductionOrderHasActivityError, ProductionOrderNotCancellableError, ProductionOrderNotFoundError } from "../errors";

export interface CancelProductionOrderInput {
  tenantId: string;
  companyId: string;
  productionOrderId: string;
}

/**
 * Cancellable from DRAFT/CONFIRMED only (the entity's own `cancel()`
 * invariant) — additionally rejected here if any real material movement
 * (issue/return) or finished-goods receipt already exists: goods that
 * physically moved cannot be un-moved by cancelling the paperwork, the
 * same reasoning `CancelPurchaseOrderUseCase` already established for
 * `PurchaseOrderHasReceiptsError`.
 */
@Injectable()
export class CancelProductionOrderUseCase {
  constructor(
    @Inject(PRODUCTION_ORDER_REPOSITORY) private readonly productionOrders: ProductionOrderRepository,
    @Inject(PRODUCTION_ORDER_MATERIAL_REPOSITORY)
    private readonly materials: ProductionOrderMaterialRepository,
    @Inject(PRODUCTION_ORDER_MATERIAL_MOVEMENT_REPOSITORY)
    private readonly movements: ProductionOrderMaterialMovementRepository,
    @Inject(PRODUCTION_ORDER_FINISHED_GOODS_RECEIPT_REPOSITORY)
    private readonly finishedGoodsReceipts: ProductionOrderFinishedGoodsReceiptRepository,
  ) {}

  async execute(input: CancelProductionOrderInput): Promise<ProductionOrder> {
    const order = await this.productionOrders.findById(input.tenantId, input.productionOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new ProductionOrderNotFoundError();
    }
    if (order.status !== "DRAFT" && order.status !== "CONFIRMED") {
      throw new ProductionOrderNotCancellableError();
    }

    const orderMaterials = await this.materials.listByProductionOrder(input.tenantId, order.id);
    for (const material of orderMaterials) {
      const materialMovements = await this.movements.listByProductionOrderMaterial(input.tenantId, material.id);
      if (materialMovements.length > 0) {
        throw new ProductionOrderHasActivityError();
      }
    }
    const receipts = await this.finishedGoodsReceipts.listByProductionOrder(input.tenantId, order.id);
    if (receipts.length > 0) {
      throw new ProductionOrderHasActivityError();
    }

    order.cancel(new Date());
    await this.productionOrders.save(order);
    return order;
  }
}
