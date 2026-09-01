import { Inject, Injectable } from "@nestjs/common";
import { ReleaseReservationUseCase } from "../../../inventory";
import { SalesOrder } from "../../domain/sales-order.entity";
import { SALES_ORDER_REPOSITORY, SalesOrderRepository } from "../../domain/sales-order.repository";
import { SALES_ORDER_LINE_REPOSITORY, SalesOrderLineRepository } from "../../domain/sales-order-line.repository";
import { SalesOrderNotCancellableError, SalesOrderNotFoundError } from "../errors";

export interface CancelSalesOrderInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  salesOrderId: string;
}

/**
 * Cancels a `DRAFT` or `CONFIRMED` order. If `CONFIRMED`, every line's
 * attached reservation is released first (the compensation this order's
 * own confirm step promised) — inventory is never left reserved for a
 * cancelled order.
 */
@Injectable()
export class CancelSalesOrderUseCase {
  constructor(
    @Inject(SALES_ORDER_REPOSITORY) private readonly salesOrders: SalesOrderRepository,
    @Inject(SALES_ORDER_LINE_REPOSITORY) private readonly lines: SalesOrderLineRepository,
    private readonly releaseReservation: ReleaseReservationUseCase,
  ) {}

  async execute(input: CancelSalesOrderInput): Promise<SalesOrder> {
    const order = await this.salesOrders.findById(input.tenantId, input.salesOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new SalesOrderNotFoundError();
    }
    if (order.status !== "DRAFT" && order.status !== "CONFIRMED") {
      throw new SalesOrderNotCancellableError();
    }

    if (order.status === "CONFIRMED") {
      const orderLines = await this.lines.listBySalesOrder(input.tenantId, order.id);
      for (const line of orderLines) {
        if (!line.reservationId) continue;
        await this.releaseReservation.execute({
          tenantId: input.tenantId,
          companyId: input.companyId,
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          reservationId: line.reservationId,
        });
      }
    }

    order.cancel(new Date());
    await this.salesOrders.save(order);
    return order;
  }
}
