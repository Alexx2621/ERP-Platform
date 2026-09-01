import { Inject, Injectable } from "@nestjs/common";
import { PosShift } from "../../domain/pos-shift.entity";
import { ListPosShiftsFilter, POS_SHIFT_REPOSITORY, PosShiftRepository } from "../../domain/pos-shift.repository";

export interface ListPosShiftsInput {
  tenantId: string;
  companyId: string;
  filter: ListPosShiftsFilter;
}

@Injectable()
export class ListPosShiftsUseCase {
  constructor(@Inject(POS_SHIFT_REPOSITORY) private readonly shifts: PosShiftRepository) {}

  async execute(input: ListPosShiftsInput): Promise<PosShift[]> {
    return this.shifts.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
