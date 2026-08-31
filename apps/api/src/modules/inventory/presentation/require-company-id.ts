import type { TenantExecutionContext } from "../../../core/tenants";
import { CompanyContextRequiredError } from "../application/errors";

/**
 * Inventory is always company-scoped (MASTER_SPEC §19-§20, same as every
 * other Master Data module). Every read/write in this module requires the
 * caller to have selected a company via X-Company-Id.
 */
export function requireCompanyId(ctx: TenantExecutionContext): string {
  if (!ctx.companyId) {
    throw new CompanyContextRequiredError();
  }
  return ctx.companyId;
}
