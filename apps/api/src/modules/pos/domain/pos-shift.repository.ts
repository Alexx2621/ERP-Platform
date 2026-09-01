import { PosShift, PosShiftStatus } from "./pos-shift.entity";

export interface ListPosShiftsFilter {
  registerId?: string;
  status?: PosShiftStatus;
  limit: number;
}

export interface PosShiftRepository {
  findById(tenantId: string, id: string): Promise<PosShift | null>;
  /** Used by `OpenShiftUseCase` to enforce "at most one OPEN shift per register" — an application-level check, not a partial unique index. */
  findOpenByRegister(tenantId: string, registerId: string): Promise<PosShift | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListPosShiftsFilter): Promise<PosShift[]>;
  save(shift: PosShift): Promise<void>;
}

export const POS_SHIFT_REPOSITORY = Symbol("POS_SHIFT_REPOSITORY");
