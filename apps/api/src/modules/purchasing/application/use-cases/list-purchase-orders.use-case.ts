import { Inject, Injectable } from "@nestjs/common";
import { PurchaseOrder } from "../../domain/purchase-order.entity";
import {
  ListPurchaseOrdersFilter,
  PURCHASE_ORDER_REPOSITORY,
  PurchaseOrderRepository,
} from "../../domain/purchase-order.repository";

export interface ListPurchaseOrdersInput {
  tenantId: string;
  companyId: string;
  filter: ListPurchaseOrdersFilter;
}

@Injectable()
export class ListPurchaseOrdersUseCase {
  constructor(@Inject(PURCHASE_ORDER_REPOSITORY) private readonly purchaseOrders: PurchaseOrderRepository) {}

  async execute(input: ListPurchaseOrdersInput): Promise<PurchaseOrder[]> {
    return this.purchaseOrders.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
