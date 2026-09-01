import { Inject, Injectable } from "@nestjs/common";
import { PosShift } from "../../domain/pos-shift.entity";
import { POS_SHIFT_REPOSITORY, PosShiftRepository } from "../../domain/pos-shift.repository";
import { PosShiftNotFoundError } from "../errors";

@Injectable()
export class GetPosShiftUseCase {
  constructor(@Inject(POS_SHIFT_REPOSITORY) private readonly shifts: PosShiftRepository) {}

  async execute(tenantId: string, companyId: string, id: string): Promise<PosShift> {
    const shift = await this.shifts.findById(tenantId, id);
    if (!shift || shift.companyId !== companyId) {
      throw new PosShiftNotFoundError();
    }
    return shift;
  }
}
