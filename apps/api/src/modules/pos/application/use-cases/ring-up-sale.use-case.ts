import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import {
  AddSalesOrderLineUseCase,
  CancelSalesOrderUseCase,
  ConfirmSalesOrderUseCase,
  CreateSalesOrderUseCase,
  FulfillSalesOrderUseCase,
  ListSalesOrderLinesUseCase,
} from "../../../sales";
import { CapturePaymentUseCase, type PaymentMethod } from "../../../payments";
import { addDecimal, assertValidNonNegativeDecimal, isNegativeDecimal, subtractDecimal } from "../../domain/decimal";
import { PosSale } from "../../domain/pos-sale.entity";
import { POS_SALE_REPOSITORY, PosSaleRepository } from "../../domain/pos-sale.repository";
import { POS_SHIFT_REPOSITORY, PosShiftRepository } from "../../domain/pos-shift.repository";
import { POS_REGISTER_REPOSITORY, PosRegisterRepository } from "../../domain/pos-register.repository";
import {
  PosPaymentFailedError,
  PosRegisterNotFoundError,
  PosSaleAmountTenderedTooLowError,
  PosSaleHasNoLinesError,
  PosSaleIdempotencyConflictError,
  PosShiftNotFoundError,
  PosShiftNotOpenError,
} from "../errors";

export interface RingUpSaleLineInput {
  productId: string;
  productVariantId?: string | null;
  taxId?: string | null;
  quantity: string;
  unitPrice?: string;
  discountAmount?: string;
}

export interface RingUpSaleInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  shiftId: string;
  customerId: string;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string | null;
  amountTendered?: string | null;
  idempotencyKey: string;
  lines: RingUpSaleLineInput[];
}

export interface RingUpSaleResult {
  posSale: PosSale;
  /** True when this call replayed an already-completed sale instead of ringing up a new one — the caller (audit trail) must not treat a replay as a fresh sale. */
  wasReplayed: boolean;
}

/**
 * Orchestrates a complete POS sale purely through Sales/Payments/Inventory's
 * own public contracts (docs/ARCHITECTURE.md §6) — never a parallel write
 * path: create a real `SalesOrder` (channel `POS`), add each line
 * (warehouse resolved from the shift's own register, price auto-resolved
 * from the catalog exactly like the ERP Sales screen), confirm it (reserves
 * inventory), capture a real `Payment` for the order's total, then fulfill
 * it (issues stock) — only then is a `PosSale` row ever written.
 *
 * Idempotent by `idempotencyKey`, mirroring `CapturePaymentUseCase`'s own
 * contract (pre-check for the common case, a real
 * `@@unique([tenantId, companyId, idempotencyKey])` constraint plus a
 * translated-conflict re-fetch for a genuine race) — this satisfies
 * `docs/ROADMAP.md` §10's exit criterion ("Reintentos de terminal no
 * duplican ventas/pagos") for the case that matters in practice: a
 * terminal that resends the exact same request *sequentially*, after
 * losing the response to a timeout. **Known limitation, not silently
 * assumed away**: because the pre-check runs once, at the very top, a
 * *simultaneous* multi-request race (not a resend, but truly overlapping
 * calls) can have every racer pass the pre-check before any of them
 * commits — each then creates and fulfills its own real `SalesOrder`
 * independently. What is still guaranteed under that race is that exactly
 * one `PosSale` row ever survives and every caller's result converges on
 * it (verified against real Postgres in `pos.integration-spec.ts`), not
 * that only one `SalesOrder`/`Payment` pair was created — a fuller fix
 * (claiming the idempotency key before any Sales/Payments call, mirroring
 * the inbox's claim-then-effect pattern, `docs/DECISIONS.md` ADR-008) is
 * deliberately out of scope for this phase; see docs/SECURITY.md "POS".
 *
 * Any failure after the order is created triggers the same compensating
 * cancellation `ConfirmSalesOrderUseCase`/`CancelSalesOrderUseCase`
 * elsewhere in this codebase already use: `CancelSalesOrderUseCase` handles
 * both a still-`DRAFT` order (a line/confirm failure — nothing to release)
 * and a `CONFIRMED` one (a declined payment — releases the reservation),
 * so one call covers every failure path here. The cancellation itself is
 * best-effort: its own failure is swallowed so it never masks the real
 * error the caller needs to see.
 */
@Injectable()
export class RingUpSaleUseCase {
  constructor(
    @Inject(POS_SALE_REPOSITORY) private readonly posSales: PosSaleRepository,
    @Inject(POS_SHIFT_REPOSITORY) private readonly shifts: PosShiftRepository,
    @Inject(POS_REGISTER_REPOSITORY) private readonly registers: PosRegisterRepository,
    private readonly createSalesOrder: CreateSalesOrderUseCase,
    private readonly addSalesOrderLine: AddSalesOrderLineUseCase,
    private readonly confirmSalesOrder: ConfirmSalesOrderUseCase,
    private readonly cancelSalesOrder: CancelSalesOrderUseCase,
    private readonly fulfillSalesOrder: FulfillSalesOrderUseCase,
    private readonly listSalesOrderLines: ListSalesOrderLinesUseCase,
    private readonly capturePayment: CapturePaymentUseCase,
  ) {}

  async execute(input: RingUpSaleInput): Promise<RingUpSaleResult> {
    const existing = await this.posSales.findByIdempotencyKey(input.tenantId, input.companyId, input.idempotencyKey);
    if (existing) {
      return { posSale: existing, wasReplayed: true };
    }

    if (input.lines.length === 0) {
      throw new PosSaleHasNoLinesError();
    }

    const shift = await this.shifts.findById(input.tenantId, input.shiftId);
    if (!shift || shift.companyId !== input.companyId) {
      throw new PosShiftNotFoundError();
    }
    if (shift.status !== "OPEN") {
      throw new PosShiftNotOpenError();
    }

    const register = await this.registers.findById(input.tenantId, shift.registerId);
    if (!register) {
      throw new PosRegisterNotFoundError();
    }

    let order = await this.createSalesOrder.execute({
      tenantId: input.tenantId,
      companyId: input.companyId,
      customerId: input.customerId,
      channel: "POS",
      currency: input.currency,
    });

    try {
      for (const line of input.lines) {
        await this.addSalesOrderLine.execute({
          tenantId: input.tenantId,
          companyId: input.companyId,
          salesOrderId: order.id,
          productId: line.productId,
          productVariantId: line.productVariantId,
          warehouseId: register.warehouseId,
          taxId: line.taxId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount,
        });
      }

      order = await this.confirmSalesOrder.execute({
        tenantId: input.tenantId,
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        salesOrderId: order.id,
      });

      const orderLines = await this.listSalesOrderLines.execute({
        tenantId: input.tenantId,
        companyId: input.companyId,
        salesOrderId: order.id,
      });
      let total = "0.0000";
      for (const line of orderLines) {
        total = addDecimal(total, line.lineTotal);
      }

      let amountTendered: string | null = null;
      let changeDue: string | null = null;
      if (input.amountTendered) {
        const tendered = assertValidNonNegativeDecimal(input.amountTendered, "amountTendered");
        const diff = subtractDecimal(tendered, total);
        if (isNegativeDecimal(diff)) {
          throw new PosSaleAmountTenderedTooLowError();
        }
        amountTendered = tendered;
        changeDue = diff;
      }

      const captureResult = await this.capturePayment.execute({
        tenantId: input.tenantId,
        companyId: input.companyId,
        salesOrderId: order.id,
        method: input.paymentMethod,
        amount: total,
        currency: order.currency,
        idempotencyKey: input.idempotencyKey,
        reference: input.paymentReference ?? null,
      });

      if (captureResult.payment.status !== "CAPTURED") {
        throw new PosPaymentFailedError(captureResult.payment.failureReason ?? "Unknown gateway failure.");
      }

      order = await this.fulfillSalesOrder.execute({
        tenantId: input.tenantId,
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        salesOrderId: order.id,
      });

      const posSale = PosSale.create({
        id: newId(),
        tenantId: input.tenantId,
        companyId: input.companyId,
        shiftId: shift.id,
        salesOrderId: order.id,
        paymentId: captureResult.payment.id,
        idempotencyKey: input.idempotencyKey,
        paymentMethod: captureResult.payment.method,
        amount: captureResult.payment.amount,
        amountTendered,
        changeDue,
        createdAt: new Date(),
      });

      try {
        await this.posSales.save(posSale);
      } catch (error) {
        if (error instanceof PosSaleIdempotencyConflictError) {
          const winner = await this.posSales.findByIdempotencyKey(input.tenantId, input.companyId, input.idempotencyKey);
          if (winner) {
            return { posSale: winner, wasReplayed: true };
          }
        }
        throw error;
      }

      return { posSale, wasReplayed: false };
    } catch (error) {
      await this.safeCancel(input, order.id);
      throw error;
    }
  }

  private async safeCancel(input: RingUpSaleInput, salesOrderId: string): Promise<void> {
    try {
      await this.cancelSalesOrder.execute({
        tenantId: input.tenantId,
        companyId: input.companyId,
        actorUserId: input.actorUserId,
        correlationId: input.correlationId,
        salesOrderId,
      });
    } catch {
      // Best-effort compensation — never mask the real error the caller needs to see.
    }
  }
}
