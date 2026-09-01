import { Inject, Injectable } from "@nestjs/common";
import { PurchaseOrder } from "../../domain/purchase-order.entity";
import { PURCHASE_ORDER_REPOSITORY, PurchaseOrderRepository } from "../../domain/purchase-order.repository";
import { PurchaseOrderNotConfirmedError, PurchaseOrderNotFoundError } from "../errors";

export interface ClosePurchaseOrderInput {
  tenantId: string;
  companyId: string;
  purchaseOrderId: string;
}

/**
 * The explicit "estado de cierre" docs/ROADMAP.md §9 asks for. Deliberately
 * does not require every line to be fully received first — a business may
 * legitimately close an order with a permanent shortfall (the supplier
 * backorders the remainder indefinitely); requiring 100% receipt would
 * make partially-fulfilled real purchasing scenarios impossible to close.
 */
@Injectable()
export class ClosePurchaseOrderUseCase {
  constructor(@Inject(PURCHASE_ORDER_REPOSITORY) private readonly purchaseOrders: PurchaseOrderRepository) {}

  async execute(input: ClosePurchaseOrderInput): Promise<PurchaseOrder> {
    const order = await this.purchaseOrders.findById(input.tenantId, input.purchaseOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new PurchaseOrderNotFoundError();
    }
    if (order.status !== "CONFIRMED") {
      throw new PurchaseOrderNotConfirmedError();
    }

    order.close(new Date());
    await this.purchaseOrders.save(order);
    return order;
  }
}
