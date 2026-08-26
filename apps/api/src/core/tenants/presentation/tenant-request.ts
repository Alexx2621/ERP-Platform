import type { TenantExecutionContext } from "../application/tenant-execution-context";

declare module "express" {
  interface Request {
    tenantContext?: TenantExecutionContext;
  }
}
