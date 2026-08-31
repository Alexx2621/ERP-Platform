import { Inject, Injectable } from "@nestjs/common";
import { Product, ProductStatus } from "../../domain/product.entity";
import { PRODUCT_REPOSITORY, ProductRepository } from "../../domain/product.repository";
import { ProductNotFoundError } from "../errors";

export interface SetProductStatusInput {
  tenantId: string;
  companyId: string;
  id: string;
  status: ProductStatus;
}

@Injectable()
export class SetProductStatusUseCase {
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository) {}

  async execute(input: SetProductStatusInput): Promise<Product> {
    const product = await this.products.findById(input.tenantId, input.id);
    if (!product || product.companyId !== input.companyId) {
      throw new ProductNotFoundError();
    }
    product.setStatus(input.status);
    await this.products.save(product);
    return product;
  }
}
