import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { GetPriceListItemUseCase } from "../../../pricing";
import { SalesOrderLine } from "../../domain/sales-order-line.entity";
import { SALES_ORDER_LINE_REPOSITORY, SalesOrderLineRepository } from "../../domain/sales-order-line.repository";
import { SALES_ORDER_REPOSITORY, SalesOrderRepository } from "../../domain/sales-order.repository";
import { SalesOrderNotDraftError, SalesOrderNotFoundError } from "../errors";
import { ResolveSalesLineTargetUseCase } from "./resolve-sales-line-target.use-case";

export interface AddSalesOrderLineInput {
  tenantId: string;
  companyId: string;
  salesOrderId: string;
  productId: string;
  productVariantId?: string | null;
  warehouseId?: string | null;
  taxId?: string | null;
  priceListId?: string | null;
  quantity: string;
  unitPrice?: string;
  discountAmount?: string;
}

/** Same price-resolution precedence as `AddQuoteLineUseCase` — see that use case's docstring. */
@Injectable()
export class AddSalesOrderLineUseCase {
  constructor(
    @Inject(SALES_ORDER_REPOSITORY) private readonly salesOrders: SalesOrderRepository,
    @Inject(SALES_ORDER_LINE_REPOSITORY) private readonly lines: SalesOrderLineRepository,
    private readonly resolveTarget: ResolveSalesLineTargetUseCase,
    private readonly getPriceListItem: GetPriceListItemUseCase,
  ) {}

  async execute(input: AddSalesOrderLineInput): Promise<SalesOrderLine> {
    const order = await this.salesOrders.findById(input.tenantId, input.salesOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new SalesOrderNotFoundError();
    }
    if (order.status !== "DRAFT") {
      throw new SalesOrderNotDraftError();
    }

    const resolved = await this.resolveTarget.execute({
      tenantId: input.tenantId,
      companyId: input.companyId,
      productId: input.productId,
      productVariantId: input.productVariantId,
      warehouseId: input.warehouseId,
      taxId: input.taxId,
      requireWarehouse: true,
    });

    let unitPrice = input.unitPrice ?? null;
    if (!unitPrice && !resolved.productVariantId && input.priceListId) {
      const priceListItem = await this.getPriceListItem.execute(input.tenantId, input.priceListId, input.productId);
      if (priceListItem) {
        unitPrice = priceListItem.price;
      }
    }
    unitPrice = unitPrice ?? resolved.defaultUnitPrice ?? "";

    const line = SalesOrderLine.create({
      id: newId(),
      tenantId: input.tenantId,
      salesOrderId: order.id,
      warehouseId: resolved.warehouseId,
      productId: input.productId,
      productVariantId: resolved.productVariantId,
      taxId: input.taxId ?? null,
      quantity: input.quantity,
      unitPrice,
      discountAmount: input.discountAmount,
      taxRate: resolved.taxRate,
      createdAt: new Date(),
    });
    await this.lines.save(line);
    return line;
  }
}
