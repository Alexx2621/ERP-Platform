import { Supplier } from "./supplier.entity";

export interface SupplierRepository {
  findById(id: string): Promise<Supplier | null>;
  findByCode(tenantId: string, companyId: string, code: string): Promise<Supplier | null>;
  findByTaxId(tenantId: string, companyId: string, taxId: string): Promise<Supplier | null>;
  listByCompany(tenantId: string, companyId: string): Promise<Supplier[]>;
  save(supplier: Supplier): Promise<void>;
}

export const SUPPLIER_REPOSITORY = Symbol("SUPPLIER_REPOSITORY");
