import type { TenantExecutionContext } from "../../../core/tenants";
import { CompanyContextRequiredError } from "../application/errors";

/**
 * Master data is always company-scoped (MASTER_SPEC §19 — unlike
 * Foundation's optional company refinement for settings/roles). Every
 * write/read in this module requires the caller to have selected a
 * company via X-Company-Id.
 */
export function requireCompanyId(ctx: TenantExecutionContext): string {
  if (!ctx.companyId) {
    throw new CompanyContextRequiredError();
  }
  return ctx.companyId;
}
