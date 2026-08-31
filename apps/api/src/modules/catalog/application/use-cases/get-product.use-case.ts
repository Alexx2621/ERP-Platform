import { Inject, Injectable } from "@nestjs/common";
import { Product } from "../../domain/product.entity";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../domain/product.repository";

/**
 * The first genuine cross-module dependency in this codebase (Pricing ->
 * Catalog, `docs/ARCHITECTURE.md` §6: "module A -> public contract of
 * module B"). Exposed as a use case, not the raw `ProductRepository`
 * interface — a consuming module gets Catalog's own read boundary, not
 * ad-hoc query access to its persistence.
 */
@Injectable()
export class GetProductUseCase {
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository) {}

  async execute(tenantId: string, id: string): Promise<Product | null> {
    return this.products.findById(tenantId, id);
  }
}
