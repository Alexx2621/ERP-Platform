import { Inject, Injectable } from "@nestjs/common";
import { SalesOrder } from "../../domain/sales-order.entity";
import { SALES_ORDER_REPOSITORY, SalesOrderRepository } from "../../domain/sales-order.repository";

/** Cross-module read boundary (docs/ARCHITECTURE.md §6) — Payments (Phase 4B) validates a salesOrderId and reads its currency through this. */
@Injectable()
export class GetSalesOrderUseCase {
  constructor(@Inject(SALES_ORDER_REPOSITORY) private readonly salesOrders: SalesOrderRepository) {}

  async execute(tenantId: string, id: string): Promise<SalesOrder | null> {
    return this.salesOrders.findById(tenantId, id);
  }
}
