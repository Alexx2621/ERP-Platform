import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import {
  DOCUMENT_NUMBER_ALLOCATOR,
  DocumentNumberAllocator,
} from "../../../../shared/document-numbering/document-number.port";
import { SalesOrder, SalesOrderProps } from "../../domain/sales-order.entity";
import { SALES_ORDER_REPOSITORY, SalesOrderRepository } from "../../domain/sales-order.repository";
import { ResolveCustomerTargetUseCase } from "./resolve-customer-target.use-case";

export const SALES_ORDER_DOCUMENT_TYPE = "SALES_ORDER";
export const SALES_ORDER_NUMBER_PREFIX = "PED";

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
    @Inject(DOCUMENT_NUMBER_ALLOCATOR) private readonly documentNumbers: DocumentNumberAllocator,
  ) {}

  async execute(input: CreateSalesOrderInput): Promise<SalesOrder> {
    await this.resolveCustomer.execute(input.tenantId, input.companyId, input.customerId);

    // Every channel that creates a sales order (ERP, POS, Commerce) comes
    // through here, so all of them get a real correlative for free.
    const number = await this.documentNumbers.allocate({
      tenantId: input.tenantId,
      companyId: input.companyId,
      documentType: SALES_ORDER_DOCUMENT_TYPE,
      prefix: SALES_ORDER_NUMBER_PREFIX,
    });

    const now = new Date();
    const order = SalesOrder.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      customerId: input.customerId,
      quoteId: null,
      number,
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
