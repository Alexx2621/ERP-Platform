import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { CreateSalesReturnUseCase, type CreateSalesReturnLineInput } from "../../../sales";
import { RefundPaymentUseCase } from "../../../payments";
import { PosReturn } from "../../domain/pos-return.entity";
import type { PosPaymentMethod } from "../../domain/pos-sale.entity";
import { POS_RETURN_REPOSITORY, PosReturnRepository } from "../../domain/pos-return.repository";
import { POS_SALE_REPOSITORY, PosSaleRepository } from "../../domain/pos-sale.repository";
import { POS_SHIFT_REPOSITORY, PosShiftRepository } from "../../domain/pos-shift.repository";
import {
  PosReturnHasNoLinesError,
  PosReturnIdempotencyConflictError,
  PosSaleNotFoundError,
  PosShiftNotFoundError,
  PosShiftNotOpenError,
} from "../errors";

export interface CreatePosReturnInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  correlationId: string;
  shiftId: string;
  posSaleId: string;
  lines: CreateSalesReturnLineInput[];
  reason?: string | null;
  issueRefund: boolean;
  idempotencyKey: string;
}

export interface CreatePosReturnResult {
  posReturn: PosReturn;
  /** True when this call replayed an already-completed return instead of creating a new one — the caller (audit trail) must not treat a replay as a fresh return. */
  wasReplayed: boolean;
}

/**
 * Mirrors `RingUpSaleUseCase`'s idempotency and orchestration shape: goods
 * always go back through Sales' own `CreateSalesReturnUseCase` (which posts
 * the real `RETURN` inventory movement), and, only if `issueRefund` is
 * true, a full refund of the sale's original `Payment` through Payments'
 * own `RefundPaymentUseCase` — never a partial refund, matching
 * `docs/DECISIONS.md` ADR-009's own deferred scope. A second, goods-only
 * return against the same `PosSale` (`issueRefund: false`) is how this
 * codebase already expects a sale to be partially returned more than once
 * without attempting to refund an already-`REFUNDED` payment a second time.
 */
@Injectable()
export class CreatePosReturnUseCase {
  constructor(
    @Inject(POS_RETURN_REPOSITORY) private readonly posReturns: PosReturnRepository,
    @Inject(POS_SALE_REPOSITORY) private readonly posSales: PosSaleRepository,
    @Inject(POS_SHIFT_REPOSITORY) private readonly shifts: PosShiftRepository,
    private readonly createSalesReturn: CreateSalesReturnUseCase,
    private readonly refundPayment: RefundPaymentUseCase,
  ) {}

  async execute(input: CreatePosReturnInput): Promise<CreatePosReturnResult> {
    const existing = await this.posReturns.findByIdempotencyKey(input.tenantId, input.companyId, input.idempotencyKey);
    if (existing) {
      return { posReturn: existing, wasReplayed: true };
    }

    if (input.lines.length === 0) {
      throw new PosReturnHasNoLinesError();
    }

    const shift = await this.shifts.findById(input.tenantId, input.shiftId);
    if (!shift || shift.companyId !== input.companyId) {
      throw new PosShiftNotFoundError();
    }
    if (shift.status !== "OPEN") {
      throw new PosShiftNotOpenError();
    }

    const posSale = await this.posSales.findById(input.tenantId, input.posSaleId);
    if (!posSale || posSale.companyId !== input.companyId) {
      throw new PosSaleNotFoundError();
    }

    const salesReturn = await this.createSalesReturn.execute({
      tenantId: input.tenantId,
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      correlationId: input.correlationId,
      salesOrderId: posSale.salesOrderId,
      reason: input.reason ?? null,
      lines: input.lines,
    });

    let refunded = false;
    let refundAmount: string | null = null;
    let refundMethod: PosPaymentMethod | null = null;
    if (input.issueRefund) {
      const payment = await this.refundPayment.execute({
        tenantId: input.tenantId,
        companyId: input.companyId,
        paymentId: posSale.paymentId,
      });
      refunded = true;
      refundAmount = payment.amount;
      refundMethod = payment.method;
    }

    const posReturn = PosReturn.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      shiftId: shift.id,
      posSaleId: posSale.id,
      salesReturnId: salesReturn.id,
      idempotencyKey: input.idempotencyKey,
      refunded,
      refundAmount,
      refundMethod,
      reason: input.reason ?? null,
      createdAt: new Date(),
    });

    try {
      await this.posReturns.save(posReturn);
    } catch (error) {
      if (error instanceof PosReturnIdempotencyConflictError) {
        const winner = await this.posReturns.findByIdempotencyKey(input.tenantId, input.companyId, input.idempotencyKey);
        if (winner) {
          return { posReturn: winner, wasReplayed: true };
        }
      }
      throw error;
    }

    return { posReturn, wasReplayed: false };
  }
}
