import { Tax } from "./tax.entity";

export interface TaxRepository {
  findById(tenantId: string, id: string): Promise<Tax | null>;
  findByCode(tenantId: string, companyId: string, code: string): Promise<Tax | null>;
  listByCompany(tenantId: string, companyId: string): Promise<Tax[]>;
  save(tax: Tax): Promise<void>;
}

export const TAX_REPOSITORY = Symbol("TAX_REPOSITORY");
