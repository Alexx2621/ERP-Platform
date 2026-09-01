import { PosReturn } from "./pos-return.entity";

export interface ListPosReturnsFilter {
  shiftId?: string;
  limit: number;
}

export interface PosReturnRepository {
  findByIdempotencyKey(tenantId: string, companyId: string, idempotencyKey: string): Promise<PosReturn | null>;
  listByPosSale(tenantId: string, posSaleId: string): Promise<PosReturn[]>;
  listByShift(tenantId: string, shiftId: string): Promise<PosReturn[]>;
  listByCompany(tenantId: string, companyId: string, filter: ListPosReturnsFilter): Promise<PosReturn[]>;
  save(posReturn: PosReturn): Promise<void>;
}

export const POS_RETURN_REPOSITORY = Symbol("POS_RETURN_REPOSITORY");
