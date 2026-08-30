import { TenantApp } from "./tenant-app.entity";

export interface TenantAppRepository {
  findByTenant(tenantId: string): Promise<TenantApp[]>;
  findByTenantAndAppDefinition(tenantId: string, appDefinitionId: string): Promise<TenantApp | null>;
  /** Throws on an unsatisfied (tenantId, appDefinitionId) FK. */
  save(tenantApp: TenantApp): Promise<void>;
}

export const TENANT_APP_REPOSITORY = Symbol("TENANT_APP_REPOSITORY");
