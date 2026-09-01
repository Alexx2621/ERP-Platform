import { Inject, Injectable } from "@nestjs/common";
import { PurchaseOrder } from "../../domain/purchase-order.entity";
import { PURCHASE_ORDER_REPOSITORY, PurchaseOrderRepository } from "../../domain/purchase-order.repository";
import {
  PURCHASE_ORDER_LINE_REPOSITORY,
  PurchaseOrderLineRepository,
} from "../../domain/purchase-order-line.repository";
import { PurchaseOrderHasNoLinesError, PurchaseOrderNotDraftError, PurchaseOrderNotFoundError } from "../errors";

export interface ConfirmPurchaseOrderInput {
  tenantId: string;
  companyId: string;
  purchaseOrderId: string;
}

/**
 * The "approvals"/"segregation of duties" gate docs/ROADMAP.md §9 asks for:
 * gated by the `purchasing.orders.approve` permission at the controller
 * level, deliberately distinct from `purchasing.orders.manage` (which
 * gates creating the order and adding its lines) — a membership can hold
 * one without the other, so drafting and approving a purchase order can be
 * two different people/roles. Unlike `ConfirmSalesOrderUseCase`, this
 * never reserves inventory: a purchase order brings stock in, it does not
 * promise stock out, so there is nothing in Inventory to reserve here.
 */
@Injectable()
export class ConfirmPurchaseOrderUseCase {
  constructor(
    @Inject(PURCHASE_ORDER_REPOSITORY) private readonly purchaseOrders: PurchaseOrderRepository,
    @Inject(PURCHASE_ORDER_LINE_REPOSITORY) private readonly lines: PurchaseOrderLineRepository,
  ) {}

  async execute(input: ConfirmPurchaseOrderInput): Promise<PurchaseOrder> {
    const order = await this.purchaseOrders.findById(input.tenantId, input.purchaseOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new PurchaseOrderNotFoundError();
    }
    if (order.status !== "DRAFT") {
      throw new PurchaseOrderNotDraftError();
    }

    const orderLines = await this.lines.listByPurchaseOrder(input.tenantId, order.id);
    if (orderLines.length === 0) {
      throw new PurchaseOrderHasNoLinesError();
    }

    order.confirm(new Date());
    await this.purchaseOrders.save(order);
    return order;
  }
}
