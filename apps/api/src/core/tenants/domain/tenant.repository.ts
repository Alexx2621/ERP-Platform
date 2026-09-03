import { Tenant } from "./tenant.entity";

export interface TenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  /** Cross-tenant by design — used only by boot-time backfill seeders, never by request handlers. */
  findAllActive(): Promise<Tenant[]>;
  save(tenant: Tenant): Promise<void>;
}

export const TENANT_REPOSITORY = Symbol("TENANT_REPOSITORY");
