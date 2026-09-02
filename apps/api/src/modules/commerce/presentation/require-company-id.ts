import type { TenantExecutionContext } from "../../../core/tenants";
import { CompanyContextRequiredError } from "../application/errors";

/** The admin side of Commerce is always company-scoped (same as every other Master Data / business module) — the public storefront side never uses this, it resolves scope from the storefront code instead. */
export function requireCompanyId(ctx: TenantExecutionContext): string {
  if (!ctx.companyId) {
    throw new CompanyContextRequiredError();
  }
  return ctx.companyId;
}
