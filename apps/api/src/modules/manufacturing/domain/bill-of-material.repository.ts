import { BillOfMaterial } from "./bill-of-material.entity";

export interface ListBillOfMaterialsFilter {
  productId?: string;
  status?: string;
  limit?: number;
}

export interface BillOfMaterialRepository {
  findById(tenantId: string, id: string): Promise<BillOfMaterial | null>;
  findByCode(tenantId: string, companyId: string, code: string): Promise<BillOfMaterial | null>;
  countByProduct(tenantId: string, companyId: string, productId: string): Promise<number>;
  listByCompany(tenantId: string, companyId: string, filter: ListBillOfMaterialsFilter): Promise<BillOfMaterial[]>;
  save(billOfMaterial: BillOfMaterial): Promise<void>;
}

export const BILL_OF_MATERIAL_REPOSITORY = Symbol("BILL_OF_MATERIAL_REPOSITORY");
