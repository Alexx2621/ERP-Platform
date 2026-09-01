import { Inject, Injectable } from "@nestjs/common";
import { Company } from "../domain/company.entity";
import { COMPANY_REPOSITORY, CompanyRepository } from "../domain/company.repository";

/**
 * Answers "which companies exist in this tenant" — the read that closes the
 * gap `TenantExecutionContext.companyId` on its own cannot: resolving a
 * context never invents a `companyId`, it only ever echoes back one the
 * caller already supplied (`ResolveTenantContextUseCase`). Without this
 * use case, a client that lost its in-memory `companyId` (e.g. reopening a
 * tenant from the tenant list after onboarding) had no way to discover it
 * again — a real gap found and closed after Sales/Payments (Phase 4)
 * shipped with no way to reach them outside the one-time onboarding flow.
 */
@Injectable()
export class ListCompaniesUseCase {
  constructor(@Inject(COMPANY_REPOSITORY) private readonly companies: CompanyRepository) {}

  async execute(tenantId: string): Promise<Company[]> {
    const companies = await this.companies.listByTenant(tenantId);
    return companies.filter((company) => company.isActive());
  }
}
