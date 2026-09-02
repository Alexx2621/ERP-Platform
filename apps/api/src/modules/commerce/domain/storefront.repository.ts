import { Storefront, StorefrontStatus } from "./storefront.entity";

export interface ListStorefrontsFilter {
  status?: StorefrontStatus;
  limit: number;
}

export interface StorefrontRepository {
  findById(tenantId: string, id: string): Promise<Storefront | null>;
  /** Global lookup — `code` is not tenant-scoped, see the entity's own docstring. */
  findByCode(code: string): Promise<Storefront | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListStorefrontsFilter): Promise<Storefront[]>;
  save(storefront: Storefront): Promise<void>;
}

export const STOREFRONT_REPOSITORY = Symbol("STOREFRONT_REPOSITORY");
