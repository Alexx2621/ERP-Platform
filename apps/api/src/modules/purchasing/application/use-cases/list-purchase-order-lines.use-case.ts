import { Inject, Injectable } from "@nestjs/common";
import { PurchaseOrderLine } from "../../domain/purchase-order-line.entity";
import {
  PURCHASE_ORDER_LINE_REPOSITORY,
  PurchaseOrderLineRepository,
} from "../../domain/purchase-order-line.repository";
import { PURCHASE_ORDER_REPOSITORY, PurchaseOrderRepository } from "../../domain/purchase-order.repository";
import { PurchaseOrderNotFoundError } from "../errors";

export interface ListPurchaseOrderLinesInput {
  tenantId: string;
  companyId: string;
  purchaseOrderId: string;
}

@Injectable()
export class ListPurchaseOrderLinesUseCase {
  constructor(
    @Inject(PURCHASE_ORDER_REPOSITORY) private readonly purchaseOrders: PurchaseOrderRepository,
    @Inject(PURCHASE_ORDER_LINE_REPOSITORY) private readonly lines: PurchaseOrderLineRepository,
  ) {}

  async execute(input: ListPurchaseOrderLinesInput): Promise<PurchaseOrderLine[]> {
    const order = await this.purchaseOrders.findById(input.tenantId, input.purchaseOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new PurchaseOrderNotFoundError();
    }
    return this.lines.listByPurchaseOrder(input.tenantId, order.id);
  }
}
