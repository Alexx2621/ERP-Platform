import { PosSale } from "./pos-sale.entity";

export interface ListPosSalesFilter {
  shiftId?: string;
  limit: number;
}

export interface PosSaleRepository {
  findById(tenantId: string, id: string): Promise<PosSale | null>;
  findByIdempotencyKey(tenantId: string, companyId: string, idempotencyKey: string): Promise<PosSale | null>;
  listByShift(tenantId: string, shiftId: string): Promise<PosSale[]>;
  listByCompany(tenantId: string, companyId: string, filter: ListPosSalesFilter): Promise<PosSale[]>;
  save(sale: PosSale): Promise<void>;
}

export const POS_SALE_REPOSITORY = Symbol("POS_SALE_REPOSITORY");
