import { Inject, Injectable } from "@nestjs/common";
import { Product } from "../../domain/product.entity";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../domain/product.repository";

@Injectable()
export class ListProductsUseCase {
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository) {}

  async execute(tenantId: string, companyId: string): Promise<Product[]> {
    return this.products.listByCompany(tenantId, companyId);
  }
}
