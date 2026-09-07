import { Inject, Injectable } from "@nestjs/common";
import { SalesOrder } from "../../domain/sales-order.entity";
import { SALES_ORDER_REPOSITORY, SalesOrderRepository } from "../../domain/sales-order.repository";
import { SalesOrderNotFoundError } from "../errors";

/** Cross-module read boundary (docs/ARCHITECTURE.md §6) — Payments (Phase 4B) validates a salesOrderId and reads its currency through this. */
@Injectable()
export class GetSalesOrderUseCase {
  constructor(@Inject(SALES_ORDER_REPOSITORY) private readonly salesOrders: SalesOrderRepository) {}

  async execute(tenantId: string, id: string): Promise<SalesOrder | null> {
    return this.salesOrders.findById(tenantId, id);
  }

  /**
   * Company-scoped read for this module's own HTTP surface. Applies the same
   * "wrong company reads as not found" rule every write use case here already
   * applies (`ConfirmSalesOrderUseCase` and friends), so an id from another
   * company is never distinguishable from one that does not exist.
   */
  async executeForCompany(tenantId: string, companyId: string, id: string): Promise<SalesOrder> {
    const order = await this.salesOrders.findById(tenantId, id);
    if (!order || order.companyId !== companyId) {
      throw new SalesOrderNotFoundError();
    }
    return order;
  }
}
