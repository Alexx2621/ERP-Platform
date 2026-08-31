import { Brand } from "./brand.entity";

export interface BrandRepository {
  findById(tenantId: string, id: string): Promise<Brand | null>;
  findByCode(tenantId: string, companyId: string, code: string): Promise<Brand | null>;
  listByCompany(tenantId: string, companyId: string): Promise<Brand[]>;
  save(brand: Brand): Promise<void>;
}

export const BRAND_REPOSITORY = Symbol("BRAND_REPOSITORY");
