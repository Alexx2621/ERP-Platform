import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { PosShift } from "../../domain/pos-shift.entity";
import { POS_SHIFT_REPOSITORY, PosShiftRepository } from "../../domain/pos-shift.repository";
import { POS_REGISTER_REPOSITORY, PosRegisterRepository } from "../../domain/pos-register.repository";
import { PosRegisterHasOpenShiftError, PosRegisterNotActiveError, PosRegisterNotFoundError } from "../errors";

export interface OpenShiftInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  registerId: string;
  openingCash: string;
  notes?: string | null;
}

/**
 * A register may have at most one `OPEN` shift at a time — checked here via
 * `PosShiftRepository.findOpenByRegister`, an application-level invariant
 * (same style as `PurchaseOrderHasReceiptsError`), not a database
 * constraint.
 */
@Injectable()
export class OpenShiftUseCase {
  constructor(
    @Inject(POS_SHIFT_REPOSITORY) private readonly shifts: PosShiftRepository,
    @Inject(POS_REGISTER_REPOSITORY) private readonly registers: PosRegisterRepository,
  ) {}

  async execute(input: OpenShiftInput): Promise<PosShift> {
    const register = await this.registers.findById(input.tenantId, input.registerId);
    if (!register || register.companyId !== input.companyId) {
      throw new PosRegisterNotFoundError();
    }
    if (register.status !== "ACTIVE") {
      throw new PosRegisterNotActiveError();
    }

    const openShift = await this.shifts.findOpenByRegister(input.tenantId, register.id);
    if (openShift) {
      throw new PosRegisterHasOpenShiftError();
    }

    const now = new Date();
    const shift = PosShift.open({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      registerId: register.id,
      status: "OPEN",
      openedByUserId: input.actorUserId,
      openedAt: now,
      openingCash: input.openingCash,
      closedByUserId: null,
      closedAt: null,
      closingCashCounted: null,
      closingCashExpected: null,
      cashVariance: null,
      notes: input.notes ?? null,
    });
    await this.shifts.save(shift);
    return shift;
  }
}
