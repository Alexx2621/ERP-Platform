import { CommerceOrder } from "./commerce-order.entity";

export interface ListCommerceOrdersFilter {
  storefrontId?: string;
  limit: number;
}

export interface CommerceOrderRepository {
  findById(tenantId: string, id: string): Promise<CommerceOrder | null>;
  /** The idempotency lookup `CheckoutUseCase` pre-checks — see that use case's docstring for why `cartId`, not a caller-supplied key, is the natural dedup key here. */
  findByCartId(tenantId: string, companyId: string, cartId: string): Promise<CommerceOrder | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListCommerceOrdersFilter): Promise<CommerceOrder[]>;
  save(order: CommerceOrder): Promise<void>;
}

export const COMMERCE_ORDER_REPOSITORY = Symbol("COMMERCE_ORDER_REPOSITORY");
