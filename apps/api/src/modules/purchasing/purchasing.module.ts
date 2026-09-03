import { Module } from "@nestjs/common";
import { AuthModule } from "../../core/auth";
import { TenantsModule } from "../../core/tenants";
import { AccessControlModule } from "../../core/access-control";
import { AuditModule } from "../../core/audit";
import { AppRegistryModule } from "../../core/app-registry";
import { CatalogModule } from "../catalog";
import { WarehousesModule } from "../warehouses";
import { SuppliersModule } from "../suppliers";
import { InventoryModule } from "../inventory";
import { PURCHASE_ORDER_REPOSITORY } from "./domain/purchase-order.repository";
import { PURCHASE_ORDER_LINE_REPOSITORY } from "./domain/purchase-order-line.repository";
import { PURCHASE_RECEIPT_REPOSITORY } from "./domain/purchase-receipt.repository";
import { PURCHASE_RECEIPT_LINE_REPOSITORY } from "./domain/purchase-receipt-line.repository";
import { PURCHASE_RETURN_REPOSITORY } from "./domain/purchase-return.repository";
import { PURCHASE_RETURN_LINE_REPOSITORY } from "./domain/purchase-return-line.repository";
import { SUPPLIER_INVOICE_REPOSITORY } from "./domain/supplier-invoice.repository";
import { PrismaPurchaseOrderRepository } from "./infrastructure/prisma-purchase-order.repository";
import { PrismaPurchaseOrderLineRepository } from "./infrastructure/prisma-purchase-order-line.repository";
import { PrismaPurchaseReceiptRepository } from "./infrastructure/prisma-purchase-receipt.repository";
import { PrismaPurchaseReceiptLineRepository } from "./infrastructure/prisma-purchase-receipt-line.repository";
import { PrismaPurchaseReturnRepository } from "./infrastructure/prisma-purchase-return.repository";
import { PrismaPurchaseReturnLineRepository } from "./infrastructure/prisma-purchase-return-line.repository";
import { PrismaSupplierInvoiceRepository } from "./infrastructure/prisma-supplier-invoice.repository";
import { ResolveSupplierTargetUseCase } from "./application/use-cases/resolve-supplier-target.use-case";
import { ResolvePurchaseLineTargetUseCase } from "./application/use-cases/resolve-purchase-line-target.use-case";
import { CreatePurchaseOrderUseCase } from "./application/use-cases/create-purchase-order.use-case";
import { AddPurchaseOrderLineUseCase } from "./application/use-cases/add-purchase-order-line.use-case";
import { ConfirmPurchaseOrderUseCase } from "./application/use-cases/confirm-purchase-order.use-case";
import { ClosePurchaseOrderUseCase } from "./application/use-cases/close-purchase-order.use-case";
import { CancelPurchaseOrderUseCase } from "./application/use-cases/cancel-purchase-order.use-case";
import { CreatePurchaseReceiptUseCase } from "./application/use-cases/create-purchase-receipt.use-case";
import { CreatePurchaseReturnUseCase } from "./application/use-cases/create-purchase-return.use-case";
import { CreateSupplierInvoiceUseCase } from "./application/use-cases/create-supplier-invoice.use-case";
import { CancelSupplierInvoiceUseCase } from "./application/use-cases/cancel-supplier-invoice.use-case";
import { ListPurchaseOrdersUseCase } from "./application/use-cases/list-purchase-orders.use-case";
import { ListPurchaseOrderLinesUseCase } from "./application/use-cases/list-purchase-order-lines.use-case";
import { ListPurchaseReceiptsUseCase } from "./application/use-cases/list-purchase-receipts.use-case";
import { ListPurchaseReceiptLinesUseCase } from "./application/use-cases/list-purchase-receipt-lines.use-case";
import { ListPurchaseReturnsUseCase } from "./application/use-cases/list-purchase-returns.use-case";
import { ListPurchaseReturnLinesUseCase } from "./application/use-cases/list-purchase-return-lines.use-case";
import { ListSupplierInvoicesUseCase } from "./application/use-cases/list-supplier-invoices.use-case";
import { GetPurchaseOrderUseCase } from "./application/use-cases/get-purchase-order.use-case";
import { PurchaseOrdersController } from "./presentation/purchase-orders.controller";
import { PurchaseReceiptsController } from "./presentation/purchase-receipts.controller";
import { PurchaseReturnsController } from "./presentation/purchase-returns.controller";
import { SupplierInvoicesController } from "./presentation/supplier-invoices.controller";

/**
 * Phase 5 (Purchasing) module. Five direct, cycle-free dependencies
 * (docs/ARCHITECTURE.md §6): Catalog/Warehouses (product+variant+warehouse
 * identity, same pattern Sales/Inventory already established), Suppliers
 * (order owner), and Inventory (the "port transaccional" Purchasing uses
 * to receive/return stock — `RecordReceiptUseCase` for receipts,
 * `RecordIssueUseCase` for returns to a supplier). None of those four
 * modules knows Purchasing exists.
 */
@Module({
  imports: [
    AuthModule,
    TenantsModule,
    AccessControlModule,
    AuditModule,
    CatalogModule,
    WarehousesModule,
    SuppliersModule,
    InventoryModule,
    AppRegistryModule,
  ],
  controllers: [
    PurchaseOrdersController,
    PurchaseReceiptsController,
    PurchaseReturnsController,
    SupplierInvoicesController,
  ],
  providers: [
    { provide: PURCHASE_ORDER_REPOSITORY, useClass: PrismaPurchaseOrderRepository },
    { provide: PURCHASE_ORDER_LINE_REPOSITORY, useClass: PrismaPurchaseOrderLineRepository },
    { provide: PURCHASE_RECEIPT_REPOSITORY, useClass: PrismaPurchaseReceiptRepository },
    { provide: PURCHASE_RECEIPT_LINE_REPOSITORY, useClass: PrismaPurchaseReceiptLineRepository },
    { provide: PURCHASE_RETURN_REPOSITORY, useClass: PrismaPurchaseReturnRepository },
    { provide: PURCHASE_RETURN_LINE_REPOSITORY, useClass: PrismaPurchaseReturnLineRepository },
    { provide: SUPPLIER_INVOICE_REPOSITORY, useClass: PrismaSupplierInvoiceRepository },
    ResolveSupplierTargetUseCase,
    ResolvePurchaseLineTargetUseCase,
    CreatePurchaseOrderUseCase,
    AddPurchaseOrderLineUseCase,
    ConfirmPurchaseOrderUseCase,
    ClosePurchaseOrderUseCase,
    CancelPurchaseOrderUseCase,
    CreatePurchaseReceiptUseCase,
    CreatePurchaseReturnUseCase,
    CreateSupplierInvoiceUseCase,
    CancelSupplierInvoiceUseCase,
    ListPurchaseOrdersUseCase,
    ListPurchaseOrderLinesUseCase,
    ListPurchaseReceiptsUseCase,
    ListPurchaseReceiptLinesUseCase,
    ListPurchaseReturnsUseCase,
    ListPurchaseReturnLinesUseCase,
    ListSupplierInvoicesUseCase,
    GetPurchaseOrderUseCase,
  ],
  exports: [ListPurchaseOrdersUseCase, ListPurchaseOrderLinesUseCase, GetPurchaseOrderUseCase],
})
export class PurchasingModule {}
