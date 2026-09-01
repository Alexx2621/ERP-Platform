import { Module } from "@nestjs/common";
import { AuthModule } from "../../core/auth";
import { TenantsModule } from "../../core/tenants";
import { AccessControlModule } from "../../core/access-control";
import { AuditModule } from "../../core/audit";
import { CatalogModule } from "../catalog";
import { WarehousesModule } from "../warehouses";
import { TaxesModule } from "../taxes";
import { PricingModule } from "../pricing";
import { CustomersModule } from "../customers";
import { InventoryModule } from "../inventory";
import { QUOTE_REPOSITORY } from "./domain/quote.repository";
import { QUOTE_LINE_REPOSITORY } from "./domain/quote-line.repository";
import { SALES_ORDER_REPOSITORY } from "./domain/sales-order.repository";
import { SALES_ORDER_LINE_REPOSITORY } from "./domain/sales-order-line.repository";
import { SALES_RETURN_REPOSITORY } from "./domain/sales-return.repository";
import { SALES_RETURN_LINE_REPOSITORY } from "./domain/sales-return-line.repository";
import { PrismaQuoteRepository } from "./infrastructure/prisma-quote.repository";
import { PrismaQuoteLineRepository } from "./infrastructure/prisma-quote-line.repository";
import { PrismaSalesOrderRepository } from "./infrastructure/prisma-sales-order.repository";
import { PrismaSalesOrderLineRepository } from "./infrastructure/prisma-sales-order-line.repository";
import { PrismaSalesReturnRepository } from "./infrastructure/prisma-sales-return.repository";
import { PrismaSalesReturnLineRepository } from "./infrastructure/prisma-sales-return-line.repository";
import { ResolveCustomerTargetUseCase } from "./application/use-cases/resolve-customer-target.use-case";
import { ResolveSalesLineTargetUseCase } from "./application/use-cases/resolve-sales-line-target.use-case";
import { CreateQuoteUseCase } from "./application/use-cases/create-quote.use-case";
import { AddQuoteLineUseCase } from "./application/use-cases/add-quote-line.use-case";
import { ConvertQuoteToSalesOrderUseCase } from "./application/use-cases/convert-quote-to-sales-order.use-case";
import { CancelQuoteUseCase } from "./application/use-cases/cancel-quote.use-case";
import { CreateSalesOrderUseCase } from "./application/use-cases/create-sales-order.use-case";
import { AddSalesOrderLineUseCase } from "./application/use-cases/add-sales-order-line.use-case";
import { ConfirmSalesOrderUseCase } from "./application/use-cases/confirm-sales-order.use-case";
import { CancelSalesOrderUseCase } from "./application/use-cases/cancel-sales-order.use-case";
import { FulfillSalesOrderUseCase } from "./application/use-cases/fulfill-sales-order.use-case";
import { CreateSalesReturnUseCase } from "./application/use-cases/create-sales-return.use-case";
import { ListQuotesUseCase } from "./application/use-cases/list-quotes.use-case";
import { ListQuoteLinesUseCase } from "./application/use-cases/list-quote-lines.use-case";
import { ListSalesOrdersUseCase } from "./application/use-cases/list-sales-orders.use-case";
import { ListSalesOrderLinesUseCase } from "./application/use-cases/list-sales-order-lines.use-case";
import { ListSalesReturnsUseCase } from "./application/use-cases/list-sales-returns.use-case";
import { ListSalesReturnLinesUseCase } from "./application/use-cases/list-sales-return-lines.use-case";
import { GetSalesOrderUseCase } from "./application/use-cases/get-sales-order.use-case";
import { QuotesController } from "./presentation/quotes.controller";
import { SalesOrdersController } from "./presentation/sales-orders.controller";
import { SalesReturnsController } from "./presentation/sales-returns.controller";

/**
 * Phase 4A (Sales) module — the most heavily cross-cutting business module
 * yet: Catalog/Warehouses (product+variant+warehouse identity, same
 * pattern Inventory already established), Taxes (per-line rate snapshot),
 * Pricing (optional price-list snapshot), Customers (order/quote owner),
 * and Inventory (the "port transaccional" ROADMAP §8 asks Sales to
 * reserve/fulfill/return stock through). Every import is directed and
 * cycle-free (docs/ARCHITECTURE.md §6) — none of those six modules knows
 * Sales exists.
 */
@Module({
  imports: [
    AuthModule,
    TenantsModule,
    AccessControlModule,
    AuditModule,
    CatalogModule,
    WarehousesModule,
    TaxesModule,
    PricingModule,
    CustomersModule,
    InventoryModule,
  ],
  controllers: [QuotesController, SalesOrdersController, SalesReturnsController],
  providers: [
    { provide: QUOTE_REPOSITORY, useClass: PrismaQuoteRepository },
    { provide: QUOTE_LINE_REPOSITORY, useClass: PrismaQuoteLineRepository },
    { provide: SALES_ORDER_REPOSITORY, useClass: PrismaSalesOrderRepository },
    { provide: SALES_ORDER_LINE_REPOSITORY, useClass: PrismaSalesOrderLineRepository },
    { provide: SALES_RETURN_REPOSITORY, useClass: PrismaSalesReturnRepository },
    { provide: SALES_RETURN_LINE_REPOSITORY, useClass: PrismaSalesReturnLineRepository },
    ResolveCustomerTargetUseCase,
    ResolveSalesLineTargetUseCase,
    CreateQuoteUseCase,
    AddQuoteLineUseCase,
    ConvertQuoteToSalesOrderUseCase,
    CancelQuoteUseCase,
    CreateSalesOrderUseCase,
    AddSalesOrderLineUseCase,
    ConfirmSalesOrderUseCase,
    CancelSalesOrderUseCase,
    FulfillSalesOrderUseCase,
    CreateSalesReturnUseCase,
    ListQuotesUseCase,
    ListQuoteLinesUseCase,
    ListSalesOrdersUseCase,
    ListSalesOrderLinesUseCase,
    ListSalesReturnsUseCase,
    ListSalesReturnLinesUseCase,
    GetSalesOrderUseCase,
  ],
  exports: [ListSalesOrdersUseCase, ListSalesOrderLinesUseCase, GetSalesOrderUseCase],
})
export class SalesModule {}
