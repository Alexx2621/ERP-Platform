import { Inject, Injectable } from "@nestjs/common";
import { PurchaseOrder } from "../../domain/purchase-order.entity";
import { PURCHASE_ORDER_REPOSITORY, PurchaseOrderRepository } from "../../domain/purchase-order.repository";

/** Cross-module read boundary (docs/ARCHITECTURE.md §6) — exported for a future consumer (e.g. Accounting), same shape as Sales' GetSalesOrderUseCase. */
@Injectable()
export class GetPurchaseOrderUseCase {
  constructor(@Inject(PURCHASE_ORDER_REPOSITORY) private readonly purchaseOrders: PurchaseOrderRepository) {}

  async execute(tenantId: string, id: string): Promise<PurchaseOrder | null> {
    return this.purchaseOrders.findById(tenantId, id);
  }
}
