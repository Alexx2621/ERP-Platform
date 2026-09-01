import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { SalesOrder, SalesOrderProps } from "../../domain/sales-order.entity";
import { SALES_ORDER_REPOSITORY, SalesOrderRepository } from "../../domain/sales-order.repository";
import { ResolveCustomerTargetUseCase } from "./resolve-customer-target.use-case";

export interface CreateSalesOrderInput {
  tenantId: string;
  companyId: string;
  customerId: string;
  channel?: SalesOrderProps["channel"];
  currency: string;
}

@Injectable()
export class CreateSalesOrderUseCase {
  constructor(
    @Inject(SALES_ORDER_REPOSITORY) private readonly salesOrders: SalesOrderRepository,
    private readonly resolveCustomer: ResolveCustomerTargetUseCase,
  ) {}

  async execute(input: CreateSalesOrderInput): Promise<SalesOrder> {
    await this.resolveCustomer.execute(input.tenantId, input.companyId, input.customerId);

    const now = new Date();
    const order = SalesOrder.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      customerId: input.customerId,
      quoteId: null,
      channel: input.channel ?? "ERP",
      status: "DRAFT",
      currency: input.currency,
      version: 1,
      createdAt: now,
      updatedAt: now,
      confirmedAt: null,
      fulfilledAt: null,
      cancelledAt: null,
    });
    await this.salesOrders.save(order);
    return order;
  }
}
