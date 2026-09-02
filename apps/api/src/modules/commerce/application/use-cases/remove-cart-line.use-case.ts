import { Inject, Injectable } from "@nestjs/common";
import { CART_LINE_REPOSITORY, CartLineRepository } from "../../domain/cart-line.repository";
import { CART_REPOSITORY, CartRepository } from "../../domain/cart.repository";
import { Storefront } from "../../domain/storefront.entity";
import { CartLineNotFoundError, CartNotFoundError, CartNotOpenError } from "../errors";

export interface RemoveCartLineInput {
  storefront: Storefront;
  cartId: string;
  cartLineId: string;
}

@Injectable()
export class RemoveCartLineUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
    @Inject(CART_LINE_REPOSITORY) private readonly cartLines: CartLineRepository,
  ) {}

  async execute(input: RemoveCartLineInput): Promise<void> {
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
    await this.cartLines.delete(input.storefront.tenantId, line.id);
  }
}
