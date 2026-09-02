import { Inject, Injectable } from "@nestjs/common";
import { CartLine } from "../../domain/cart-line.entity";
import { CART_LINE_REPOSITORY, CartLineRepository } from "../../domain/cart-line.repository";
import { CART_REPOSITORY, CartRepository } from "../../domain/cart.repository";
import { Storefront } from "../../domain/storefront.entity";
import { CartLineNotFoundError, CartNotFoundError, CartNotOpenError } from "../errors";

export interface UpdateCartLineQuantityInput {
  storefront: Storefront;
  cartId: string;
  cartLineId: string;
  quantity: string;
}

@Injectable()
export class UpdateCartLineQuantityUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
    @Inject(CART_LINE_REPOSITORY) private readonly cartLines: CartLineRepository,
  ) {}

  async execute(input: UpdateCartLineQuantityInput): Promise<CartLine> {
    const cart = await this.carts.findById(input.storefront.tenantId, input.cartId);
    if (!cart || cart.storefrontId !== input.storefront.id) {
      throw new CartNotFoundError();
    }
    if (cart.status !== "OPEN") {
      throw new CartNotOpenError();
    }
    const line = await this.cartLines.findById(input.storefront.tenantId, input.cartLineId);
    if (!line || line.cartId !== cart.id) {
      throw new CartLineNotFoundError();
    }
    line.setQuantity(input.quantity);
    await this.cartLines.save(line);
    return line;
  }
}
