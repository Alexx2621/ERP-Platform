import { Inject, Injectable } from "@nestjs/common";
import { addDecimal, subtractDecimal } from "../../domain/decimal";
import { PosShift } from "../../domain/pos-shift.entity";
import { POS_SHIFT_REPOSITORY, PosShiftRepository } from "../../domain/pos-shift.repository";
import { POS_CASH_MOVEMENT_REPOSITORY, PosCashMovementRepository } from "../../domain/pos-cash-movement.repository";
import { POS_SALE_REPOSITORY, PosSaleRepository } from "../../domain/pos-sale.repository";
import { POS_RETURN_REPOSITORY, PosReturnRepository } from "../../domain/pos-return.repository";
import { PosShiftNotFoundError, PosShiftNotOpenError } from "../errors";

export interface CloseShiftInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  shiftId: string;
  closingCashCounted: string;
}

/**
 * Computes `closingCashExpected` from the shift's own ledger — `openingCash`
 * plus every `PosCashMovement` (CASH_IN adds, CASH_OUT subtracts) plus every
 * CASH `PosSale.amount` minus every CASH `PosReturn.refundAmount` — using
 * only POS's own dependency-free decimal arithmetic (`docs/ROADMAP.md` §10
 * exit criterion: "Cierres y cash movements son auditables y Decimal-safe").
 * This is a ledger read computed fresh at close time, never a running
 * counter that could drift — the same philosophy `InventoryBalance` and
 * every running-sum validation in Sales/Purchasing already established.
 */
@Injectable()
export class CloseShiftUseCase {
  constructor(
    @Inject(POS_SHIFT_REPOSITORY) private readonly shifts: PosShiftRepository,
    @Inject(POS_CASH_MOVEMENT_REPOSITORY) private readonly cashMovements: PosCashMovementRepository,
    @Inject(POS_SALE_REPOSITORY) private readonly posSales: PosSaleRepository,
    @Inject(POS_RETURN_REPOSITORY) private readonly posReturns: PosReturnRepository,
  ) {}

  async execute(input: CloseShiftInput): Promise<PosShift> {
    const shift = await this.shifts.findById(input.tenantId, input.shiftId);
    if (!shift || shift.companyId !== input.companyId) {
      throw new PosShiftNotFoundError();
    }
    if (shift.status !== "OPEN") {
      throw new PosShiftNotOpenError();
    }

    let expected = shift.openingCash;

    const movements = await this.cashMovements.listByShift(input.tenantId, shift.id);
    for (const movement of movements) {
      expected = movement.type === "CASH_IN" ? addDecimal(expected, movement.amount) : subtractDecimal(expected, movement.amount);
    }

    const sales = await this.posSales.listByShift(input.tenantId, shift.id);
    for (const sale of sales) {
      if (sale.paymentMethod === "CASH") {
        expected = addDecimal(expected, sale.amount);
      }
    }

    const returns = await this.posReturns.listByShift(input.tenantId, shift.id);
    for (const posReturn of returns) {
      if (posReturn.refunded && posReturn.refundMethod === "CASH" && posReturn.refundAmount) {
        expected = subtractDecimal(expected, posReturn.refundAmount);
      }
    }

    shift.close(new Date(), input.actorUserId, input.closingCashCounted, expected);
    await this.shifts.save(shift);
    return shift;
  }
}
