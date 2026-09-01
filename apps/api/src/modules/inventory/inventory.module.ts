import { Module } from "@nestjs/common";
import { AuthModule } from "../../core/auth";
import { TenantsModule } from "../../core/tenants";
import { AccessControlModule } from "../../core/access-control";
import { AuditModule } from "../../core/audit";
import { CatalogModule } from "../catalog";
import { WarehousesModule } from "../warehouses";
import { INVENTORY_MOVEMENT_REPOSITORY } from "./domain/inventory-movement.repository";
import { INVENTORY_BALANCE_REPOSITORY } from "./domain/inventory-balance.repository";
import { INVENTORY_TRANSFER_REPOSITORY } from "./domain/inventory-transfer.repository";
import { INVENTORY_RESERVATION_REPOSITORY } from "./domain/inventory-reservation.repository";
import { PrismaInventoryMovementRepository } from "./infrastructure/prisma-inventory-movement.repository";
import { PrismaInventoryBalanceRepository } from "./infrastructure/prisma-inventory-balance.repository";
import { PrismaInventoryTransferRepository } from "./infrastructure/prisma-inventory-transfer.repository";
import { PrismaInventoryReservationRepository } from "./infrastructure/prisma-inventory-reservation.repository";
import { ResolveWarehouseTargetUseCase } from "./application/use-cases/resolve-warehouse-target.use-case";
import { ResolveProductTargetUseCase } from "./application/use-cases/resolve-product-target.use-case";
import { RecordReceiptUseCase } from "./application/use-cases/record-receipt.use-case";
import { RecordIssueUseCase } from "./application/use-cases/record-issue.use-case";
import { RecordReturnUseCase } from "./application/use-cases/record-return.use-case";
import { AdjustInventoryUseCase } from "./application/use-cases/adjust-inventory.use-case";
import { ListInventoryBalancesUseCase } from "./application/use-cases/list-inventory-balances.use-case";
import { ListInventoryMovementsUseCase } from "./application/use-cases/list-inventory-movements.use-case";
import { CreateReservationUseCase } from "./application/use-cases/create-reservation.use-case";
import { ReleaseReservationUseCase } from "./application/use-cases/release-reservation.use-case";
import { ListInventoryReservationsUseCase } from "./application/use-cases/list-inventory-reservations.use-case";
import { CreateTransferUseCase } from "./application/use-cases/create-transfer.use-case";
import { CompleteTransferUseCase } from "./application/use-cases/complete-transfer.use-case";
import { CancelTransferUseCase } from "./application/use-cases/cancel-transfer.use-case";
import { ListInventoryTransfersUseCase } from "./application/use-cases/list-inventory-transfers.use-case";
import { InventoryController } from "./presentation/inventory.controller";

/**
 * Phase 3 (Inventory) module — the second business module (after Pricing)
 * to import other business modules directly: Catalog (for
 * `GetProductUseCase`/`GetProductVariantUseCase`) and Warehouses (for
 * `GetWarehouseUseCase`), both directed, cycle-free dependencies
 * (docs/ARCHITECTURE.md §6) — neither Catalog nor Warehouses knows
 * Inventory exists. Sales (Phase 4) imports this module for
 * `CreateReservationUseCase`/`ReleaseReservationUseCase`/
 * `RecordIssueUseCase`/`RecordReturnUseCase` — the "port transaccional"
 * ROADMAP §8 asks Sales to reserve/fulfill/return stock through. Purchasing
 * (Phase 5) additionally imports `RecordReceiptUseCase` (goods arriving)
 * and reuses `RecordIssueUseCase` (goods returned to a supplier).
 */
@Module({
  imports: [AuthModule, TenantsModule, AccessControlModule, AuditModule, CatalogModule, WarehousesModule],
  controllers: [InventoryController],
  providers: [
    { provide: INVENTORY_MOVEMENT_REPOSITORY, useClass: PrismaInventoryMovementRepository },
    { provide: INVENTORY_BALANCE_REPOSITORY, useClass: PrismaInventoryBalanceRepository },
    { provide: INVENTORY_TRANSFER_REPOSITORY, useClass: PrismaInventoryTransferRepository },
    { provide: INVENTORY_RESERVATION_REPOSITORY, useClass: PrismaInventoryReservationRepository },
    ResolveWarehouseTargetUseCase,
    ResolveProductTargetUseCase,
    RecordReceiptUseCase,
    RecordIssueUseCase,
    RecordReturnUseCase,
    AdjustInventoryUseCase,
    ListInventoryBalancesUseCase,
    ListInventoryMovementsUseCase,
    CreateReservationUseCase,
    ReleaseReservationUseCase,
    ListInventoryReservationsUseCase,
    CreateTransferUseCase,
    CompleteTransferUseCase,
    CancelTransferUseCase,
    ListInventoryTransfersUseCase,
  ],
  exports: [
    ListInventoryBalancesUseCase,
    ListInventoryMovementsUseCase,
    CreateReservationUseCase,
    ReleaseReservationUseCase,
    RecordIssueUseCase,
    RecordReturnUseCase,
    RecordReceiptUseCase,
  ],
})
export class InventoryModule {}
