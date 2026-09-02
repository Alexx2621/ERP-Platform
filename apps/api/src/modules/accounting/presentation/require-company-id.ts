import type { TenantExecutionContext } from "../../../core/tenants";
import { CompanyContextRequiredError } from "../application/errors";

/** Accounting is always company-scoped — every Chart of Accounts, fiscal period and posting belongs to one company, never the tenant at large. */
export function requireCompanyId(ctx: TenantExecutionContext): string {
  if (!ctx.companyId) {
    throw new CompanyContextRequiredError();
  }
  return ctx.companyId;
}
