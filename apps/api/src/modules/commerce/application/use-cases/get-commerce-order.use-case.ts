import { Inject, Injectable } from "@nestjs/common";
import { CommerceOrder } from "../../domain/commerce-order.entity";
import { COMMERCE_ORDER_REPOSITORY, CommerceOrderRepository } from "../../domain/commerce-order.repository";
import { Storefront } from "../../domain/storefront.entity";
import { CommerceOrderNotFoundError } from "../errors";

export interface GetCommerceOrderInput {
  storefront: Storefront;
  orderId: string;
}

/**
 * The confirmation-page lookup — reachable with no authentication, scoped
 * only by the order's own unguessable id plus its storefront (the same
 * "an unguessable UUID is public-identifier-safe" precedent `Cart.id`
 * already establishes). Carries no payment-card data or anything else more
 * sensitive than what the shopper themself just typed at checkout.
 */
@Injectable()
export class GetCommerceOrderUseCase {
  constructor(@Inject(COMMERCE_ORDER_REPOSITORY) private readonly orders: CommerceOrderRepository) {}

  async execute(input: GetCommerceOrderInput): Promise<CommerceOrder> {
    const order = await this.orders.findById(input.storefront.tenantId, input.orderId);
    if (!order || order.storefrontId !== input.storefront.id) {
      throw new CommerceOrderNotFoundError();
    }
    return order;
  }
}
