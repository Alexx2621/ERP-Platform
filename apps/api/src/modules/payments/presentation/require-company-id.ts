import type { TenantExecutionContext } from "../../../core/tenants";
import { CompanyContextRequiredError } from "../application/errors";

/** Payments is always company-scoped, same as every other business module (MASTER_SPEC §19-§22). */
export function requireCompanyId(ctx: TenantExecutionContext): string {
  if (!ctx.companyId) {
    throw new CompanyContextRequiredError();
  }
  return ctx.companyId;
}
