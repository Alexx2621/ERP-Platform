import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { RecordReturnUseCase } from "../../../inventory";
import { addDecimal, isNegativeDecimal, subtractDecimal } from "../../domain/decimal";
import { SalesReturn } from "../../domain/sales-return.entity";
import { SalesReturnLine } from "../../domain/sales-return-line.entity";
import { SALES_RETURN_REPOSITORY, SalesReturnRepository } from "../../domain/sales-return.repository";
import { SALES_RETURN_LINE_REPOSITORY, SalesReturnLineRepository } from "../../domain/sales-return-line.repository";
import { SALES_ORDER_REPOSITORY, SalesOrderRepository } from "../../domain/sales-order.repository";
import { SALES_ORDER_LINE_REPOSITORY, SalesOrderLineRepository } from "../../domain/sales-order-line.repository";
import {
  SalesOrderLineNotFoundError,
  SalesOrderNotFoundError,
  SalesOrderNotFulfilledError,
  SalesReturnExceedsFulfilledQuantityError,
  SalesReturnHasNoLinesError,
} from "../errors";

export interface CreateSalesReturnLineInput {
  salesOrderLineId: string;
  quantity: string;
}

export interface CreateSalesReturnInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  salesOrderId: string;
  reason?: string | null;
  lines: CreateSalesReturnLineInput[];
}

/**
 * A return is its own record, never a `SalesOrder` status mutation (see
 * `SalesReturn`'s docstring). Each line is validated against the running
 * sum of every prior return for the same `SalesOrderLine` — computed by
 * reading `SalesReturnLineRepository.listBySalesOrderLine`, not a stored
 * counter — so it is impossible to return more than was ever fulfilled,
 * even across several separate return requests over time.
 */
@Injectable()
export class CreateSalesReturnUseCase {
  constructor(
    @Inject(SALES_ORDER_REPOSITORY) private readonly salesOrders: SalesOrderRepository,
    @Inject(SALES_ORDER_LINE_REPOSITORY) private readonly salesOrderLines: SalesOrderLineRepository,
    @Inject(SALES_RETURN_REPOSITORY) private readonly salesReturns: SalesReturnRepository,
    @Inject(SALES_RETURN_LINE_REPOSITORY) private readonly salesReturnLines: SalesReturnLineRepository,
    private readonly recordReturn: RecordReturnUseCase,
  ) {}

  async execute(input: CreateSalesReturnInput): Promise<SalesReturn> {
    const order = await this.salesOrders.findById(input.tenantId, input.salesOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new SalesOrderNotFoundError();
    }
    if (order.status !== "FULFILLED") {
      throw new SalesOrderNotFulfilledError();
    }
    if (input.lines.length === 0) {
      throw new SalesReturnHasNoLinesError();
    }

    const now = new Date();
    const salesReturn = SalesReturn.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      salesOrderId: order.id,
      reason: input.reason ?? null,
      createdAt: now,
    });

    const returnLines: SalesReturnLine[] = [];
    for (const requested of input.lines) {
      const orderLine = await this.salesOrderLines.findById(input.tenantId, requested.salesOrderLineId);
      if (!orderLine || orderLine.salesOrderId !== order.id) {
        throw new SalesOrderLineNotFoundError();
      }

      const priorReturns = await this.salesReturnLines.listBySalesOrderLine(input.tenantId, orderLine.id);
      const alreadyReturned = priorReturns.reduce((sum, prior) => addDecimal(sum, prior.quantity), "0.0000");
      const returnLine = SalesReturnLine.create({
        id: newId(),
        tenantId: input.tenantId,
        salesReturnId: salesReturn.id,
        salesOrderLineId: orderLine.id,
        quantity: requested.quantity,
        createdAt: now,
      });
      const totalAfter = addDecimal(alreadyReturned, returnLine.quantity);
      const remaining = subtractDecimal(orderLine.quantity, totalAfter);
      if (isNegativeDecimal(remaining)) {
        throw new SalesReturnExceedsFulfilledQuantityError();
      }

      returnLines.push(returnLine);

      if (orderLine.warehouseId) {
        await this.recordReturn.execute({
          tenantId: input.tenantId,
          companyId: input.companyId,
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          warehouseId: orderLine.warehouseId,
          productId: orderLine.productId,
          productVariantId: orderLine.productVariantId,
          quantity: returnLine.quantity,
          referenceType: "SALES_RETURN",
          referenceId: salesReturn.id,
        });
      }
    }

    await this.salesReturns.save(salesReturn);
    for (const returnLine of returnLines) {
      await this.salesReturnLines.save(returnLine);
    }

    return salesReturn;
  }
}
