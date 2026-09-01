import { Inject, Injectable } from "@nestjs/common";
import { CreateReservationUseCase, InsufficientInventoryError, ReleaseReservationUseCase } from "../../../inventory";
import { SalesOrder } from "../../domain/sales-order.entity";
import { SalesOrderLine } from "../../domain/sales-order-line.entity";
import { SALES_ORDER_REPOSITORY, SalesOrderRepository } from "../../domain/sales-order.repository";
import { SALES_ORDER_LINE_REPOSITORY, SalesOrderLineRepository } from "../../domain/sales-order-line.repository";
import { InsufficientInventoryForOrderError, SalesOrderHasNoLinesError, SalesOrderNotDraftError, SalesOrderNotFoundError } from "../errors";

export interface ConfirmSalesOrderInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  salesOrderId: string;
}

/**
 * The "port transaccional" `docs/ROADMAP.md` §8 asks Sales to reserve
 * inventory through. Each line needing inventory (`warehouseId !== null`,
 * i.e. its product tracks inventory) is reserved one at a time via
 * Inventory's own public `CreateReservationUseCase` — there is no single
 * database transaction wrapping every line's reservation together, because
 * `InventoryBalanceRepository.applyMovement` already owns its own
 * per-balance-row transaction (docs/DATABASE.md "Inventory tables").
 * Instead, this use case implements the compensating-transaction pattern
 * `docs/ROADMAP.md` §8's exit criteria explicitly names ("Confirm/cancel/
 * return tienen invariantes y compensaciones probadas"): if any line's
 * reservation is rejected (insufficient available stock), every reservation
 * already made for this same confirm attempt is released again before the
 * error is re-thrown, so a failed confirm never leaves a partially-reserved
 * order behind.
 */
@Injectable()
export class ConfirmSalesOrderUseCase {
  constructor(
    @Inject(SALES_ORDER_REPOSITORY) private readonly salesOrders: SalesOrderRepository,
    @Inject(SALES_ORDER_LINE_REPOSITORY) private readonly lines: SalesOrderLineRepository,
    private readonly createReservation: CreateReservationUseCase,
    private readonly releaseReservation: ReleaseReservationUseCase,
  ) {}

  async execute(input: ConfirmSalesOrderInput): Promise<SalesOrder> {
    const order = await this.salesOrders.findById(input.tenantId, input.salesOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new SalesOrderNotFoundError();
    }
    if (order.status !== "DRAFT") {
      throw new SalesOrderNotDraftError();
    }

    const orderLines = await this.lines.listBySalesOrder(input.tenantId, order.id);
    if (orderLines.length === 0) {
      throw new SalesOrderHasNoLinesError();
    }

    const reservedSoFar: { line: SalesOrderLine; reservationId: string }[] = [];

    for (const line of orderLines) {
      if (!line.warehouseId) {
        continue; // this product doesn't track inventory — nothing to reserve
      }
      try {
        const { reservation } = await this.createReservation.execute({
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
        reservedSoFar.push({ line, reservationId: reservation.id });
      } catch (error) {
        if (error instanceof InsufficientInventoryError) {
          for (const { reservationId } of reservedSoFar) {
            await this.releaseReservation.execute({
              tenantId: input.tenantId,
              companyId: input.companyId,
              actorUserId: input.actorUserId,
              correlationId: input.correlationId,
              reservationId,
            });
          }
          throw new InsufficientInventoryForOrderError(line.productId);
        }
        throw error;
      }
    }

    for (const { line, reservationId } of reservedSoFar) {
      line.attachReservation(reservationId);
      await this.lines.save(line);
    }

    order.confirm(new Date());
    await this.salesOrders.save(order);
    return order;
  }
}
