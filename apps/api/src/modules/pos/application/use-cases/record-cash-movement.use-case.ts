import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { PosCashMovement, PosCashMovementType } from "../../domain/pos-cash-movement.entity";
import { POS_CASH_MOVEMENT_REPOSITORY, PosCashMovementRepository } from "../../domain/pos-cash-movement.repository";
import { POS_SHIFT_REPOSITORY, PosShiftRepository } from "../../domain/pos-shift.repository";
import { PosShiftNotFoundError, PosShiftNotOpenError } from "../errors";

export interface RecordCashMovementInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  shiftId: string;
  type: PosCashMovementType;
  amount: string;
  reason: string;
}

@Injectable()
export class RecordCashMovementUseCase {
  constructor(
    @Inject(POS_CASH_MOVEMENT_REPOSITORY) private readonly cashMovements: PosCashMovementRepository,
    @Inject(POS_SHIFT_REPOSITORY) private readonly shifts: PosShiftRepository,
  ) {}

  async execute(input: RecordCashMovementInput): Promise<PosCashMovement> {
    const shift = await this.shifts.findById(input.tenantId, input.shiftId);
    if (!shift || shift.companyId !== input.companyId) {
      throw new PosShiftNotFoundError();
    }
    if (shift.status !== "OPEN") {
      throw new PosShiftNotOpenError();
    }

    const movement = PosCashMovement.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      shiftId: shift.id,
      type: input.type,
      amount: input.amount,
      reason: input.reason,
      recordedByUserId: input.actorUserId,
      createdAt: new Date(),
    });
    await this.cashMovements.save(movement);
    return movement;
  }
}
