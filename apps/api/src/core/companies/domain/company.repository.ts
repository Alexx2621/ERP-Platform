import { Company } from "./company.entity";

/** Every lookup requires tenantId; no unscoped company query is exposed. */
export interface CompanyRepository {
  findById(tenantId: string, id: string): Promise<Company | null>;
  findByCode(tenantId: string, code: string): Promise<Company | null>;
  /** Every company belonging to a tenant, regardless of status — callers that only want ACTIVE ones filter client-side (see `ListCompaniesUseCase`). */
  listByTenant(tenantId: string): Promise<Company[]>;
  save(company: Company): Promise<void>;
}

export const COMPANY_REPOSITORY = Symbol("COMPANY_REPOSITORY");
