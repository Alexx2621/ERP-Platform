import { Company } from "./company.entity";

/** Every lookup requires tenantId; no unscoped company query is exposed. */
export interface CompanyRepository {
  findById(tenantId: string, id: string): Promise<Company | null>;
  findByCode(tenantId: string, code: string): Promise<Company | null>;
  save(company: Company): Promise<void>;
}

export const COMPANY_REPOSITORY = Symbol("COMPANY_REPOSITORY");
