import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { RecordIssueUseCase } from "../../../inventory";
import { addDecimal, isNegativeDecimal, subtractDecimal } from "../../domain/decimal";
import { PurchaseReturn } from "../../domain/purchase-return.entity";
import { PurchaseReturnLine } from "../../domain/purchase-return-line.entity";
import { PURCHASE_RETURN_REPOSITORY, PurchaseReturnRepository } from "../../domain/purchase-return.repository";
import {
  PURCHASE_RETURN_LINE_REPOSITORY,
  PurchaseReturnLineRepository,
} from "../../domain/purchase-return-line.repository";
import {
  PURCHASE_RECEIPT_LINE_REPOSITORY,
  PurchaseReceiptLineRepository,
} from "../../domain/purchase-receipt-line.repository";
import { PURCHASE_ORDER_REPOSITORY, PurchaseOrderRepository } from "../../domain/purchase-order.repository";
import {
  PURCHASE_ORDER_LINE_REPOSITORY,
  PurchaseOrderLineRepository,
} from "../../domain/purchase-order-line.repository";
import {
  PurchaseOrderLineNotFoundError,
  PurchaseOrderNotFoundError,
  PurchaseReturnExceedsReceivedQuantityError,
  PurchaseReturnHasNoLinesError,
} from "../errors";

export interface CreatePurchaseReturnLineInput {
  purchaseOrderLineId: string;
  quantity: string;
}

export interface CreatePurchaseReturnInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  purchaseOrderId: string;
  reason?: string | null;
  lines: CreatePurchaseReturnLineInput[];
}

/**
 * A return is its own record, never a `PurchaseOrder`/`PurchaseReceipt`
 * status mutation (see `PurchaseReturn`'s docstring). Each line is
 * validated against "received so far minus already returned so far" — both
 * computed as running sums over the real ledgers
 * (`PurchaseReceiptLineRepository`/`PurchaseReturnLineRepository`), never
 * stored counters — so it is impossible to return more than was ever
 * physically received, even across several separate return requests over
 * time. Posts a real `ISSUE` inventory movement per line
 * (`referenceType: "PURCHASE_RETURN"`) since goods are physically leaving
 * the warehouse back to the supplier — unlike Sales returns, which use
 * `RecordReturnUseCase` (stock coming back in), this is the opposite
 * direction, so it reuses `RecordIssueUseCase` instead.
 */
@Injectable()
export class CreatePurchaseReturnUseCase {
  constructor(
    @Inject(PURCHASE_ORDER_REPOSITORY) private readonly purchaseOrders: PurchaseOrderRepository,
    @Inject(PURCHASE_ORDER_LINE_REPOSITORY) private readonly purchaseOrderLines: PurchaseOrderLineRepository,
    @Inject(PURCHASE_RECEIPT_LINE_REPOSITORY) private readonly receiptLines: PurchaseReceiptLineRepository,
    @Inject(PURCHASE_RETURN_REPOSITORY) private readonly purchaseReturns: PurchaseReturnRepository,
    @Inject(PURCHASE_RETURN_LINE_REPOSITORY) private readonly returnLines: PurchaseReturnLineRepository,
    private readonly recordIssue: RecordIssueUseCase,
  ) {}

  async execute(input: CreatePurchaseReturnInput): Promise<PurchaseReturn> {
    const order = await this.purchaseOrders.findById(input.tenantId, input.purchaseOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new PurchaseOrderNotFoundError();
    }
    if (input.lines.length === 0) {
      throw new PurchaseReturnHasNoLinesError();
    }

    const now = new Date();
    const purchaseReturn = PurchaseReturn.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      purchaseOrderId: order.id,
      reason: input.reason ?? null,
      createdAt: now,
    });

    const linesToSave: PurchaseReturnLine[] = [];
    for (const requested of input.lines) {
      const orderLine = await this.purchaseOrderLines.findById(input.tenantId, requested.purchaseOrderLineId);
      if (!orderLine || orderLine.purchaseOrderId !== order.id) {
        throw new PurchaseOrderLineNotFoundError();
      }

      const priorReceipts = await this.receiptLines.listByPurchaseOrderLine(input.tenantId, orderLine.id);
      const totalReceived = priorReceipts.reduce((sum, prior) => addDecimal(sum, prior.quantity), "0.0000");

      const priorReturns = await this.returnLines.listByPurchaseOrderLine(input.tenantId, orderLine.id);
      const alreadyReturned = priorReturns.reduce((sum, prior) => addDecimal(sum, prior.quantity), "0.0000");

      const returnLine = PurchaseReturnLine.create({
        id: newId(),
        tenantId: input.tenantId,
        purchaseReturnId: purchaseReturn.id,
        purchaseOrderLineId: orderLine.id,
        quantity: requested.quantity,
        createdAt: now,
      });
      const totalReturnedAfter = addDecimal(alreadyReturned, returnLine.quantity);
      const remaining = subtractDecimal(totalReceived, totalReturnedAfter);
      if (isNegativeDecimal(remaining)) {
        throw new PurchaseReturnExceedsReceivedQuantityError();
      }

      linesToSave.push(returnLine);

      if (orderLine.warehouseId) {
        await this.recordIssue.execute({
          tenantId: input.tenantId,
          companyId: input.companyId,
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          warehouseId: orderLine.warehouseId,
          productId: orderLine.productId,
          productVariantId: orderLine.productVariantId,
          quantity: returnLine.quantity,
          referenceType: "PURCHASE_RETURN",
          referenceId: purchaseReturn.id,
        });
      }
    }

    await this.purchaseReturns.save(purchaseReturn);
    for (const line of linesToSave) {
      await this.returnLines.save(line);
    }

    return purchaseReturn;
  }
}
