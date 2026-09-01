import { Inject, Injectable } from "@nestjs/common";
import { RecordIssueUseCase, ReleaseReservationUseCase } from "../../../inventory";
import { SalesOrder } from "../../domain/sales-order.entity";
import { SALES_ORDER_REPOSITORY, SalesOrderRepository } from "../../domain/sales-order.repository";
import { SALES_ORDER_LINE_REPOSITORY, SalesOrderLineRepository } from "../../domain/sales-order-line.repository";
import { SalesOrderNotConfirmedError, SalesOrderNotFoundError } from "../errors";

export interface FulfillSalesOrderInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  salesOrderId: string;
}

/**
 * For each line with an attached reservation: releases it, then issues the
 * same quantity as real stock leaving the warehouse
 * (`RecordIssueUseCase`, `referenceType: "SALES_ORDER"`). Net effect on
 * the balance: `onHand` decreases by the line quantity, `reserved`
 * decreases by the same amount, `available` is unchanged — reserved stock
 * simply becomes gone rather than becoming available again, exactly the
 * real-world behavior of "the reservation was fulfilled." Two ledger rows
 * per line (`RELEASE` then `ISSUE`) rather than one combined movement type
 * — see `ConfirmSalesOrderUseCase`'s own docstring for why this module
 * reuses Inventory's existing use cases as-is instead of adding a new
 * movement type that touches both balance buckets at once.
 */
@Injectable()
export class FulfillSalesOrderUseCase {
  constructor(
    @Inject(SALES_ORDER_REPOSITORY) private readonly salesOrders: SalesOrderRepository,
    @Inject(SALES_ORDER_LINE_REPOSITORY) private readonly lines: SalesOrderLineRepository,
    private readonly releaseReservation: ReleaseReservationUseCase,
    private readonly recordIssue: RecordIssueUseCase,
  ) {}

  async execute(input: FulfillSalesOrderInput): Promise<SalesOrder> {
    const order = await this.salesOrders.findById(input.tenantId, input.salesOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new SalesOrderNotFoundError();
    }
    if (order.status !== "CONFIRMED") {
      throw new SalesOrderNotConfirmedError();
    }

    const orderLines = await this.lines.listBySalesOrder(input.tenantId, order.id);
    for (const line of orderLines) {
      if (!line.reservationId || !line.warehouseId) continue;

      await this.releaseReservation.execute({
        tenantId: input.tenantId,
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        reservationId: line.reservationId,
      });

      await this.recordIssue.execute({
        tenantId: input.tenantId,
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        warehouseId: line.warehouseId,
        productId: line.productId,
        productVariantId: line.productVariantId,
        quantity: line.quantity,
        referenceType: "SALES_ORDER",
        referenceId: order.id,
      });
    }

    order.fulfill(new Date());
    await this.salesOrders.save(order);
    return order;
  }
}
