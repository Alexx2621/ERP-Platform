import { ProductVariant } from "./product-variant.entity";

export interface ProductVariantRepository {
  findById(tenantId: string, id: string): Promise<ProductVariant | null>;
  findBySku(tenantId: string, sku: string): Promise<ProductVariant | null>;
  listByProduct(tenantId: string, productId: string): Promise<ProductVariant[]>;
  save(variant: ProductVariant): Promise<void>;
}

export const PRODUCT_VARIANT_REPOSITORY = Symbol("PRODUCT_VARIANT_REPOSITORY");
