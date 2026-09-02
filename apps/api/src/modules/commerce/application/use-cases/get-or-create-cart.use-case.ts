import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { Cart } from "../../domain/cart.entity";
import { CART_REPOSITORY, CartRepository } from "../../domain/cart.repository";
import { Storefront } from "../../domain/storefront.entity";

export interface GetOrCreateCartInput {
  storefront: Storefront;
  /** The public cart token from a returning shopper's browser, if any. */
  cartId?: string | null;
}

/**
 * If `cartId` resolves to a real, still-`OPEN` cart for this exact
 * storefront, it is reused as-is (a shopper reloading the page keeps their
 * cart); otherwise (missing, foreign, already-`CONVERTED`, or simply
 * unknown) a brand-new empty cart is created — never an error, since an
 * anonymous shopper's very first request never has a cart token yet.
 */
@Injectable()
export class GetOrCreateCartUseCase {
  constructor(@Inject(CART_REPOSITORY) private readonly carts: CartRepository) {}

  async execute(input: GetOrCreateCartInput): Promise<Cart> {
    if (input.cartId) {
      const existing = await this.carts.findById(input.storefront.tenantId, input.cartId);
      if (existing && existing.storefrontId === input.storefront.id && existing.status === "OPEN") {
        return existing;
      }
    }

    const now = new Date();
    const cart = Cart.create({
      id: newId(),
      tenantId: input.storefront.tenantId,
      companyId: input.storefront.companyId,
      storefrontId: input.storefront.id,
      currency: input.storefront.currency,
      status: "OPEN",
      createdAt: now,
      updatedAt: now,
    });
    await this.carts.save(cart);
    return cart;
  }
}
