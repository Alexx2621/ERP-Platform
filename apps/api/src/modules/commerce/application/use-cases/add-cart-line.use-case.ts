import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { GetProductUseCase, GetProductVariantUseCase, ProductNotFoundError, ProductVariantNotFoundError } from "../../../catalog";
import { CartLine } from "../../domain/cart-line.entity";
import { CART_LINE_REPOSITORY, CartLineRepository } from "../../domain/cart-line.repository";
import { CART_REPOSITORY, CartRepository } from "../../domain/cart.repository";
import { STOREFRONT_PRODUCT_REPOSITORY, StorefrontProductRepository } from "../../domain/storefront-product.repository";
import { Storefront } from "../../domain/storefront.entity";
import { addDecimal, assertValidPositiveDecimal } from "../../domain/decimal";
import {
  CartNotFoundError,
  CartNotOpenError,
  ProductVariantNotAllowedError,
  ProductVariantRequiredError,
  StorefrontProductNotFoundError,
} from "../errors";

export interface AddCartLineInput {
  storefront: Storefront;
  cartId: string;
  productId: string;
  productVariantId?: string | null;
  quantity: string;
}

/**
 * `unitPrice` is always resolved from the Catalog here, never accepted from
 * the caller — a public, anonymous endpoint must never let a client dictate
 * its own price (the same "the server is the only source of truth for
 * price" rule `AddSalesOrderLineUseCase`'s own resolution already
 * enforces, just with no manual-override escape hatch here, since there is
 * no authenticated staff member on the other end who could legitimately
 * need one). Increases `quantity` on an existing line for the same
 * (product, variant) instead of creating a second one.
 */
@Injectable()
export class AddCartLineUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
    @Inject(CART_LINE_REPOSITORY) private readonly cartLines: CartLineRepository,
    @Inject(STOREFRONT_PRODUCT_REPOSITORY) private readonly publications: StorefrontProductRepository,
    private readonly getProduct: GetProductUseCase,
    private readonly getProductVariant: GetProductVariantUseCase,
  ) {}

  async execute(input: AddCartLineInput): Promise<CartLine> {
    const cart = await this.carts.findById(input.storefront.tenantId, input.cartId);
    if (!cart || cart.storefrontId !== input.storefront.id) {
      throw new CartNotFoundError();
    }
    if (cart.status !== "OPEN") {
      throw new CartNotOpenError();
    }

    const publication = await this.publications.findByStorefrontAndProduct(input.storefront.tenantId, input.storefront.id, input.productId);
    if (!publication || publication.status !== "PUBLISHED") {
      throw new StorefrontProductNotFoundError();
    }

    const product = await this.getProduct.execute(input.storefront.tenantId, input.productId);
    if (!product || product.status !== "ACTIVE") {
      throw new ProductNotFoundError();
    }

    let productVariantId: string | null = null;
    let unitPrice = product.basePrice;
    if (product.hasVariants) {
      if (!input.productVariantId) {
        throw new ProductVariantRequiredError();
      }
      const variant = await this.getProductVariant.execute(input.storefront.tenantId, input.productVariantId);
      if (!variant || variant.productId !== product.id || variant.status !== "ACTIVE") {
        throw new ProductVariantNotFoundError();
      }
      productVariantId = variant.id;
      unitPrice = variant.price;
    } else if (input.productVariantId) {
      throw new ProductVariantNotAllowedError();
    }
    if (!unitPrice) {
      throw new Error("This product has no price configured yet.");
    }

    const quantity = assertValidPositiveDecimal(input.quantity, "quantity");

    const existing = await this.cartLines.findByCartAndTarget(input.storefront.tenantId, cart.id, product.id, productVariantId);
    if (existing) {
      existing.setQuantity(addDecimal(existing.quantity, quantity));
      await this.cartLines.save(existing);
      return existing;
    }

    const now = new Date();
    const line = CartLine.create({
      id: newId(),
      tenantId: input.storefront.tenantId,
      cartId: cart.id,
      productId: product.id,
      productVariantId,
      quantity,
      unitPrice,
      createdAt: now,
      updatedAt: now,
    });
    await this.cartLines.save(line);
    return line;
  }
}
