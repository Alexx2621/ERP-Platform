import { ProductVariant } from "../domain/product-variant.entity";
import { ProductVariantRepository } from "../domain/product-variant.repository";

export class InMemoryProductVariantRepository implements ProductVariantRepository {
  private readonly byId = new Map<string, ProductVariant>();

  async findById(tenantId: string, id: string): Promise<ProductVariant | null> {
    const variant = this.byId.get(id);
    return variant && variant.tenantId === tenantId ? variant : null;
  }

  async findBySku(tenantId: string, sku: string): Promise<ProductVariant | null> {
    return [...this.byId.values()].find((v) => v.tenantId === tenantId && v.sku === sku) ?? null;
  }

  async listByProduct(tenantId: string, productId: string): Promise<ProductVariant[]> {
    return [...this.byId.values()].filter((v) => v.tenantId === tenantId && v.productId === productId);
  }

  async save(variant: ProductVariant): Promise<void> {
    this.byId.set(variant.id, variant);
  }
}
