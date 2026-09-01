import { Inject, Injectable } from "@nestjs/common";
import { SalesOrderLine } from "../../domain/sales-order-line.entity";
import { SALES_ORDER_LINE_REPOSITORY, SalesOrderLineRepository } from "../../domain/sales-order-line.repository";
import { SALES_ORDER_REPOSITORY, SalesOrderRepository } from "../../domain/sales-order.repository";
import { SalesOrderNotFoundError } from "../errors";

export interface ListSalesOrderLinesInput {
  tenantId: string;
  companyId: string;
  salesOrderId: string;
}

@Injectable()
export class ListSalesOrderLinesUseCase {
  constructor(
    @Inject(SALES_ORDER_REPOSITORY) private readonly salesOrders: SalesOrderRepository,
    @Inject(SALES_ORDER_LINE_REPOSITORY) private readonly lines: SalesOrderLineRepository,
  ) {}

  async execute(input: ListSalesOrderLinesInput): Promise<SalesOrderLine[]> {
    const order = await this.salesOrders.findById(input.tenantId, input.salesOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new SalesOrderNotFoundError();
    }
    return this.lines.listBySalesOrder(input.tenantId, order.id);
  }
}
