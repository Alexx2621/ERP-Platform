import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { RecordReceiptUseCase } from "../../../inventory";
import { addDecimal, isNegativeDecimal, subtractDecimal } from "../../domain/decimal";
import { PurchaseReceipt } from "../../domain/purchase-receipt.entity";
import { PurchaseReceiptLine } from "../../domain/purchase-receipt-line.entity";
import { PURCHASE_RECEIPT_REPOSITORY, PurchaseReceiptRepository } from "../../domain/purchase-receipt.repository";
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
  PurchaseOrderNotConfirmedError,
  PurchaseOrderNotFoundError,
  PurchaseReceiptExceedsOrderedQuantityError,
  PurchaseReceiptHasNoLinesError,
} from "../errors";

export interface CreatePurchaseReceiptLineInput {
  purchaseOrderLineId: string;
  quantity: string;
}

export interface CreatePurchaseReceiptInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  purchaseOrderId: string;
  notes?: string | null;
  lines: CreatePurchaseReceiptLineInput[];
}

/**
 * The "recepción parcial" `docs/ROADMAP.md` §9 requires explicitly. Each
 * line is validated against the running sum of every prior receipt for the
 * same `PurchaseOrderLine` — computed by reading
 * `PurchaseReceiptLineRepository.listByPurchaseOrderLine`, not a stored
 * counter — so it is impossible to receive more than was ever ordered,
 * even across several separate receipts over time (same pattern
 * `CreateSalesReturnUseCase` uses for "already returned"). Only requires
 * the order to be `CONFIRMED`, not fully un-received — receiving twice
 * against the same order, partially each time, is exactly the scenario
 * this exists for.
 */
@Injectable()
export class CreatePurchaseReceiptUseCase {
  constructor(
    @Inject(PURCHASE_ORDER_REPOSITORY) private readonly purchaseOrders: PurchaseOrderRepository,
    @Inject(PURCHASE_ORDER_LINE_REPOSITORY) private readonly purchaseOrderLines: PurchaseOrderLineRepository,
    @Inject(PURCHASE_RECEIPT_REPOSITORY) private readonly receipts: PurchaseReceiptRepository,
    @Inject(PURCHASE_RECEIPT_LINE_REPOSITORY) private readonly receiptLines: PurchaseReceiptLineRepository,
    private readonly recordReceipt: RecordReceiptUseCase,
  ) {}

  async execute(input: CreatePurchaseReceiptInput): Promise<PurchaseReceipt> {
    const order = await this.purchaseOrders.findById(input.tenantId, input.purchaseOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new PurchaseOrderNotFoundError();
    }
    if (order.status !== "CONFIRMED") {
      throw new PurchaseOrderNotConfirmedError();
    }
    if (input.lines.length === 0) {
      throw new PurchaseReceiptHasNoLinesError();
    }

    const now = new Date();
    const receipt = PurchaseReceipt.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      purchaseOrderId: order.id,
      notes: input.notes ?? null,
      createdAt: now,
    });

    const linesToSave: PurchaseReceiptLine[] = [];
    for (const requested of input.lines) {
      const orderLine = await this.purchaseOrderLines.findById(input.tenantId, requested.purchaseOrderLineId);
      if (!orderLine || orderLine.purchaseOrderId !== order.id) {
        throw new PurchaseOrderLineNotFoundError();
      }

      const priorReceipts = await this.receiptLines.listByPurchaseOrderLine(input.tenantId, orderLine.id);
      const alreadyReceived = priorReceipts.reduce((sum, prior) => addDecimal(sum, prior.quantity), "0.0000");
      const receiptLine = PurchaseReceiptLine.create({
        id: newId(),
        tenantId: input.tenantId,
        purchaseReceiptId: receipt.id,
        purchaseOrderLineId: orderLine.id,
        quantity: requested.quantity,
        createdAt: now,
      });
      const totalAfter = addDecimal(alreadyReceived, receiptLine.quantity);
      const remaining = subtractDecimal(orderLine.quantity, totalAfter);
      if (isNegativeDecimal(remaining)) {
        throw new PurchaseReceiptExceedsOrderedQuantityError();
      }

      linesToSave.push(receiptLine);

      if (orderLine.warehouseId) {
        await this.recordReceipt.execute({
          tenantId: input.tenantId,
          companyId: input.companyId,
          actorUserId: input.actorUserId,
          correlationId: input.correlationId,
          warehouseId: orderLine.warehouseId,
          productId: orderLine.productId,
          productVariantId: orderLine.productVariantId,
          quantity: receiptLine.quantity,
          referenceType: "PURCHASE_ORDER",
          referenceId: order.id,
        });
      }
    }

    await this.receipts.save(receipt);
    for (const line of linesToSave) {
      await this.receiptLines.save(line);
    }

    return receipt;
  }
}
