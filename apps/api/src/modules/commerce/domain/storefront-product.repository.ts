import { StorefrontProduct, StorefrontProductStatus } from "./storefront-product.entity";

export interface ListStorefrontProductsFilter {
  status?: StorefrontProductStatus;
  limit: number;
}

export interface StorefrontProductRepository {
  findByStorefrontAndProduct(tenantId: string, storefrontId: string, productId: string): Promise<StorefrontProduct | null>;
  listByStorefront(tenantId: string, storefrontId: string, filter: ListStorefrontProductsFilter): Promise<StorefrontProduct[]>;
  save(publication: StorefrontProduct): Promise<void>;
}

export const STOREFRONT_PRODUCT_REPOSITORY = Symbol("STOREFRONT_PRODUCT_REPOSITORY");
