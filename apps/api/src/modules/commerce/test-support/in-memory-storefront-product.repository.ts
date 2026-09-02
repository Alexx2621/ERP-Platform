import { StorefrontProduct } from "../domain/storefront-product.entity";
import { ListStorefrontProductsFilter, StorefrontProductRepository } from "../domain/storefront-product.repository";

export class InMemoryStorefrontProductRepository implements StorefrontProductRepository {
  private readonly byId = new Map<string, StorefrontProduct>();

  async findByStorefrontAndProduct(tenantId: string, storefrontId: string, productId: string): Promise<StorefrontProduct | null> {
    return (
      [...this.byId.values()].find(
        (p) => p.tenantId === tenantId && p.storefrontId === storefrontId && p.productId === productId,
      ) ?? null
    );
  }

  async listByStorefront(tenantId: string, storefrontId: string, filter: ListStorefrontProductsFilter): Promise<StorefrontProduct[]> {
    return [...this.byId.values()]
      .filter(
        (p) => p.tenantId === tenantId && p.storefrontId === storefrontId && (filter.status === undefined || p.status === filter.status),
      )
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, filter.limit);
  }

  async save(publication: StorefrontProduct): Promise<void> {
    this.byId.set(publication.id, publication);
  }
}
