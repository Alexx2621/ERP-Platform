import { Inject, Injectable } from "@nestjs/common";
import { PurchaseOrder } from "../../domain/purchase-order.entity";
import { PURCHASE_ORDER_REPOSITORY, PurchaseOrderRepository } from "../../domain/purchase-order.repository";
import { PURCHASE_RECEIPT_REPOSITORY, PurchaseReceiptRepository } from "../../domain/purchase-receipt.repository";
import { PurchaseOrderHasReceiptsError, PurchaseOrderNotCancellableError, PurchaseOrderNotFoundError } from "../errors";

export interface CancelPurchaseOrderInput {
  tenantId: string;
  companyId: string;
  purchaseOrderId: string;
}

/**
 * Cancellable from DRAFT/CONFIRMED only (the entity's own `cancel()`
 * invariant) — additionally rejected here, before ever touching the
 * entity, if any real receipt already exists for this order: goods that
 * physically arrived cannot be un-arrived by cancelling the paperwork.
 * That check needs a cross-table read (`PurchaseReceiptRepository`), which
 * is why it lives in this use case rather than `PurchaseOrder.cancel()`
 * (docs/ARCHITECTURE.md §6: domain can't query other tables) — same
 * reasoning `docs/ROADMAP.md` §9's "cancelación ... conservan
 * trazabilidad" exit criterion calls for.
 */
@Injectable()
export class CancelPurchaseOrderUseCase {
  constructor(
    @Inject(PURCHASE_ORDER_REPOSITORY) private readonly purchaseOrders: PurchaseOrderRepository,
    @Inject(PURCHASE_RECEIPT_REPOSITORY) private readonly receipts: PurchaseReceiptRepository,
  ) {}

  async execute(input: CancelPurchaseOrderInput): Promise<PurchaseOrder> {
    const order = await this.purchaseOrders.findById(input.tenantId, input.purchaseOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new PurchaseOrderNotFoundError();
    }
    if (order.status !== "DRAFT" && order.status !== "CONFIRMED") {
      throw new PurchaseOrderNotCancellableError();
    }

    const existingReceipts = await this.receipts.listByPurchaseOrder(input.tenantId, order.id);
    if (existingReceipts.length > 0) {
      throw new PurchaseOrderHasReceiptsError();
    }

    order.cancel(new Date());
    await this.purchaseOrders.save(order);
    return order;
  }
}
