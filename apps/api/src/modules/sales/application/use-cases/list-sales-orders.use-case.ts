import { Inject, Injectable } from "@nestjs/common";
import { SalesOrder } from "../../domain/sales-order.entity";
import { ListSalesOrdersFilter, SALES_ORDER_REPOSITORY, SalesOrderRepository } from "../../domain/sales-order.repository";

export interface ListSalesOrdersInput {
  tenantId: string;
  companyId: string;
  filter: ListSalesOrdersFilter;
}

@Injectable()
export class ListSalesOrdersUseCase {
  constructor(@Inject(SALES_ORDER_REPOSITORY) private readonly salesOrders: SalesOrderRepository) {}

  async execute(input: ListSalesOrdersInput): Promise<SalesOrder[]> {
    return this.salesOrders.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
