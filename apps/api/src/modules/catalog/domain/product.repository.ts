import { Product } from "./product.entity";

export interface ProductRepository {
  findById(tenantId: string, id: string): Promise<Product | null>;
  findByCode(tenantId: string, companyId: string, code: string): Promise<Product | null>;
  findByBarcode(tenantId: string, companyId: string, barcode: string): Promise<Product | null>;
  listByCompany(tenantId: string, companyId: string): Promise<Product[]>;
  save(product: Product): Promise<void>;
}

export const PRODUCT_REPOSITORY = Symbol("PRODUCT_REPOSITORY");
