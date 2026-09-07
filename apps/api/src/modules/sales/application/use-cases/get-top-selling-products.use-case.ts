import { Inject, Injectable } from "@nestjs/common";
import { GetProductUseCase } from "../../../catalog/application/use-cases/get-product.use-case";
import { SALES_ORDER_REPOSITORY, SalesOrderRepository } from "../../domain/sales-order.repository";
import {
  SALES_ORDER_LINE_REPOSITORY,
  SalesOrderLineRepository,
} from "../../domain/sales-order-line.repository";

export interface TopSellingProduct {
  productId: string;
  productCode: string;
  productName: string;
  quantity: string;
  revenue: string;
}

export interface GetTopSellingProductsInput {
  tenantId: string;
  companyId: string;
  /** How far back to look, in days. */
  sinceDays: number;
  limit: number;
}

/**
 * Real revenue ranking for the home dashboard's "Top productos" widget —
 * never a fabricated or hardcoded list.
 *
 * Deliberately does not add a date-range/status filter to
 * `SalesOrderRepository` itself: it reuses the same `listByCompany` call
 * (capped at 200, the same limit every list screen in this codebase already
 * accepts) and filters in-application for "not cancelled" and "created
 * within the window" — the qualifying order ids are then handed to
 * `SalesOrderLineRepository.topProductTotals`, a pure aggregation with no
 * knowledge of `SalesOrder`'s own fields. Each result's product code/name is
 * resolved through Catalog's own public `GetProductUseCase`
 * (docs/ARCHITECTURE.md §6: "module A -> public contract of module B"),
 * never a raw join across module tables.
 */
@Injectable()
export class GetTopSellingProductsUseCase {
  constructor(
    @Inject(SALES_ORDER_REPOSITORY) private readonly salesOrders: SalesOrderRepository,
    @Inject(SALES_ORDER_LINE_REPOSITORY) private readonly salesOrderLines: SalesOrderLineRepository,
    private readonly getProduct: GetProductUseCase,
  ) {}

  async execute(input: GetTopSellingProductsInput): Promise<TopSellingProduct[]> {
    const orders = await this.salesOrders.listByCompany(input.tenantId, input.companyId, { limit: 200 });
    const since = new Date(Date.now() - input.sinceDays * 24 * 60 * 60 * 1000);
    const qualifyingOrderIds = orders
      .filter((order) => order.status !== "CANCELLED" && order.createdAt >= since)
      .map((order) => order.id);
    if (qualifyingOrderIds.length === 0) return [];

    const aggregates = await this.salesOrderLines.topProductTotals(
      input.tenantId,
      qualifyingOrderIds,
      input.limit,
    );

    const results: TopSellingProduct[] = [];
    for (const aggregate of aggregates) {
      const product = await this.getProduct.execute(input.tenantId, aggregate.productId);
      // Referential integrity makes a missing product unreachable in
      // practice; skipped defensively rather than surfacing a broken row.
      if (!product) continue;
      results.push({
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        quantity: aggregate.quantity,
        revenue: aggregate.revenue,
      });
    }
    return results;
  }
}
