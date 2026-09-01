import { Inject, Injectable } from "@nestjs/common";
import { PosCashMovement } from "../../domain/pos-cash-movement.entity";
import { POS_CASH_MOVEMENT_REPOSITORY, PosCashMovementRepository } from "../../domain/pos-cash-movement.repository";
import { POS_SHIFT_REPOSITORY, PosShiftRepository } from "../../domain/pos-shift.repository";
import { PosShiftNotFoundError } from "../errors";

@Injectable()
export class ListCashMovementsUseCase {
  constructor(
    @Inject(POS_CASH_MOVEMENT_REPOSITORY) private readonly cashMovements: PosCashMovementRepository,
    @Inject(POS_SHIFT_REPOSITORY) private readonly shifts: PosShiftRepository,
  ) {}

  async execute(tenantId: string, companyId: string, shiftId: string): Promise<PosCashMovement[]> {
    const shift = await this.shifts.findById(tenantId, shiftId);
    if (!shift || shift.companyId !== companyId) {
      throw new PosShiftNotFoundError();
    }
    return this.cashMovements.listByShift(tenantId, shift.id);
  }
}
