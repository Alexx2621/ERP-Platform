import { Inject, Injectable } from "@nestjs/common";
import { Cart } from "../../domain/cart.entity";
import { CartLine } from "../../domain/cart-line.entity";
import { CART_REPOSITORY, CartRepository } from "../../domain/cart.repository";
import { CART_LINE_REPOSITORY, CartLineRepository } from "../../domain/cart-line.repository";
import { Storefront } from "../../domain/storefront.entity";
import { CartNotFoundError } from "../errors";

export interface GetCartInput {
  storefront: Storefront;
  cartId: string;
}

export interface CartWithLines {
  cart: Cart;
  lines: CartLine[];
}

@Injectable()
export class GetCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
    @Inject(CART_LINE_REPOSITORY) private readonly cartLines: CartLineRepository,
  ) {}

  async execute(input: GetCartInput): Promise<CartWithLines> {
    const cart = await this.carts.findById(input.storefront.tenantId, input.cartId);
    if (!cart || cart.storefrontId !== input.storefront.id) {
      throw new CartNotFoundError();
    }
    const lines = await this.cartLines.listByCart(input.storefront.tenantId, cart.id);
    return { cart, lines };
  }
}
