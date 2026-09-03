import { Module } from "@nestjs/common";
import { AuthModule } from "../../core/auth";
import { TenantsModule } from "../../core/tenants";
import { AccessControlModule } from "../../core/access-control";
import { AuditModule } from "../../core/audit";
import { CatalogModule } from "../catalog";
import { WarehousesModule } from "../warehouses";
import { InventoryModule } from "../inventory";
import { BILL_OF_MATERIAL_REPOSITORY } from "./domain/bill-of-material.repository";
import { BILL_OF_MATERIAL_COMPONENT_REPOSITORY } from "./domain/bill-of-material-component.repository";
import { PRODUCTION_ORDER_REPOSITORY } from "./domain/production-order.repository";
import { PRODUCTION_ORDER_MATERIAL_REPOSITORY } from "./domain/production-order-material.repository";
import { PRODUCTION_ORDER_MATERIAL_MOVEMENT_REPOSITORY } from "./domain/production-order-material-movement.repository";
import { PRODUCTION_ORDER_OPERATION_REPOSITORY } from "./domain/production-order-operation.repository";
import { PRODUCTION_ORDER_FINISHED_GOODS_RECEIPT_REPOSITORY } from "./domain/production-order-finished-goods-receipt.repository";
import { PrismaBillOfMaterialRepository } from "./infrastructure/prisma-bill-of-material.repository";
import { PrismaBillOfMaterialComponentRepository } from "./infrastructure/prisma-bill-of-material-component.repository";
import { PrismaProductionOrderRepository } from "./infrastructure/prisma-production-order.repository";
import { PrismaProductionOrderMaterialRepository } from "./infrastructure/prisma-production-order-material.repository";
import { PrismaProductionOrderMaterialMovementRepository } from "./infrastructure/prisma-production-order-material-movement.repository";
import { PrismaProductionOrderOperationRepository } from "./infrastructure/prisma-production-order-operation.repository";
import { PrismaProductionOrderFinishedGoodsReceiptRepository } from "./infrastructure/prisma-production-order-finished-goods-receipt.repository";
import { ResolveManufacturingProductTargetUseCase } from "./application/use-cases/resolve-manufacturing-product-target.use-case";
import { CreateBillOfMaterialUseCase } from "./application/use-cases/create-bill-of-material.use-case";
import { SetBillOfMaterialStatusUseCase } from "./application/use-cases/set-bill-of-material-status.use-case";
import { ListBillsOfMaterialUseCase } from "./application/use-cases/list-bills-of-material.use-case";
import { GetBillOfMaterialUseCase } from "./application/use-cases/get-bill-of-material.use-case";
import { ListBillOfMaterialComponentsUseCase } from "./application/use-cases/list-bill-of-material-components.use-case";
import { CreateProductionOrderUseCase } from "./application/use-cases/create-production-order.use-case";
import { ConfirmProductionOrderUseCase } from "./application/use-cases/confirm-production-order.use-case";
import { CloseProductionOrderUseCase } from "./application/use-cases/close-production-order.use-case";
import { CancelProductionOrderUseCase } from "./application/use-cases/cancel-production-order.use-case";
import { ListProductionOrdersUseCase } from "./application/use-cases/list-production-orders.use-case";
import { GetProductionOrderUseCase } from "./application/use-cases/get-production-order.use-case";
import { ListProductionOrderMaterialsUseCase } from "./application/use-cases/list-production-order-materials.use-case";
import { IssueProductionOrderMaterialUseCase } from "./application/use-cases/issue-production-order-material.use-case";
import { ReturnProductionOrderMaterialUseCase } from "./application/use-cases/return-production-order-material.use-case";
import { RecordFinishedGoodsUseCase } from "./application/use-cases/record-finished-goods.use-case";
import { ListProductionOrderFinishedGoodsReceiptsUseCase } from "./application/use-cases/list-production-order-finished-goods-receipts.use-case";
import { AddProductionOrderOperationUseCase } from "./application/use-cases/add-production-order-operation.use-case";
import { CompleteProductionOrderOperationUseCase } from "./application/use-cases/complete-production-order-operation.use-case";
import { ListProductionOrderOperationsUseCase } from "./application/use-cases/list-production-order-operations.use-case";
import { BillsOfMaterialController } from "./presentation/bills-of-material.controller";
import { ProductionOrdersController } from "./presentation/production-orders.controller";

/**
 * Phase 10 (Manufacturing) module. Three direct, cycle-free dependencies
 * (docs/ARCHITECTURE.md §6): Catalog (finished good + component identity,
 * every one of which must have `trackInventory === true` —
 * docs/DECISIONS.md ADR-014 point 4), Warehouses (where a production
 * order issues materials from and receives finished goods into), and
 * Inventory — the "port transaccional" this module uses to move real
 * stock (`RecordIssueUseCase`/`RecordReturnUseCase` for materials,
 * `RecordReceiptUseCase` for finished goods). None of those three modules
 * knows Manufacturing exists.
 */
@Module({
  imports: [AuthModule, TenantsModule, AccessControlModule, AuditModule, CatalogModule, WarehousesModule, InventoryModule],
  controllers: [BillsOfMaterialController, ProductionOrdersController],
  providers: [
    { provide: BILL_OF_MATERIAL_REPOSITORY, useClass: PrismaBillOfMaterialRepository },
    { provide: BILL_OF_MATERIAL_COMPONENT_REPOSITORY, useClass: PrismaBillOfMaterialComponentRepository },
    { provide: PRODUCTION_ORDER_REPOSITORY, useClass: PrismaProductionOrderRepository },
    { provide: PRODUCTION_ORDER_MATERIAL_REPOSITORY, useClass: PrismaProductionOrderMaterialRepository },
    { provide: PRODUCTION_ORDER_MATERIAL_MOVEMENT_REPOSITORY, useClass: PrismaProductionOrderMaterialMovementRepository },
    { provide: PRODUCTION_ORDER_OPERATION_REPOSITORY, useClass: PrismaProductionOrderOperationRepository },
    {
      provide: PRODUCTION_ORDER_FINISHED_GOODS_RECEIPT_REPOSITORY,
      useClass: PrismaProductionOrderFinishedGoodsReceiptRepository,
    },
    ResolveManufacturingProductTargetUseCase,
    CreateBillOfMaterialUseCase,
    SetBillOfMaterialStatusUseCase,
    ListBillsOfMaterialUseCase,
    GetBillOfMaterialUseCase,
    ListBillOfMaterialComponentsUseCase,
    CreateProductionOrderUseCase,
    ConfirmProductionOrderUseCase,
    CloseProductionOrderUseCase,
    CancelProductionOrderUseCase,
    ListProductionOrdersUseCase,
    GetProductionOrderUseCase,
    ListProductionOrderMaterialsUseCase,
    IssueProductionOrderMaterialUseCase,
    ReturnProductionOrderMaterialUseCase,
    RecordFinishedGoodsUseCase,
    ListProductionOrderFinishedGoodsReceiptsUseCase,
    AddProductionOrderOperationUseCase,
    CompleteProductionOrderOperationUseCase,
    ListProductionOrderOperationsUseCase,
  ],
  exports: [ListProductionOrdersUseCase, GetProductionOrderUseCase],
})
export class ManufacturingModule {}
