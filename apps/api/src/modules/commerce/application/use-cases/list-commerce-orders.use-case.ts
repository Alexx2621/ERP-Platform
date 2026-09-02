import { Inject, Injectable } from "@nestjs/common";
import { CommerceOrder } from "../../domain/commerce-order.entity";
import { COMMERCE_ORDER_REPOSITORY, CommerceOrderRepository, ListCommerceOrdersFilter } from "../../domain/commerce-order.repository";

export interface ListCommerceOrdersInput {
  tenantId: string;
  companyId: string;
  filter: ListCommerceOrdersFilter;
}

/** Admin view of completed checkouts. A `CommerceOrder`'s own `SalesOrder`/`Payment` are managed exactly like any other channel's, through the existing Sales/Payments screens — this list is a Commerce-scoped index into them, not a separate order-management surface. */
@Injectable()
export class ListCommerceOrdersUseCase {
  constructor(@Inject(COMMERCE_ORDER_REPOSITORY) private readonly orders: CommerceOrderRepository) {}

  async execute(input: ListCommerceOrdersInput): Promise<CommerceOrder[]> {
    return this.orders.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
