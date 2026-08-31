import { Module } from "@nestjs/common";
import { AuthModule } from "../../core/auth";
import { TenantsModule } from "../../core/tenants";
import { AccessControlModule } from "../../core/access-control";
import { AuditModule } from "../../core/audit";
import { WAREHOUSE_REPOSITORY } from "./domain/warehouse.repository";
import { PrismaWarehouseRepository } from "./infrastructure/prisma-warehouse.repository";
import { CreateWarehouseUseCase } from "./application/use-cases/create-warehouse.use-case";
import { UpdateWarehouseUseCase } from "./application/use-cases/update-warehouse.use-case";
import { ListWarehousesUseCase } from "./application/use-cases/list-warehouses.use-case";
import { SetWarehouseStatusUseCase } from "./application/use-cases/set-warehouse-status.use-case";
import { GetWarehouseUseCase } from "./application/use-cases/get-warehouse.use-case";
import { WarehousesController } from "./presentation/warehouses.controller";

/**
 * Phase 2 (Master Data) module — sibling of Taxes/Customers/Suppliers/
 * Catalog, deliberately outside `core/` (docs/ARCHITECTURE.md §5.3-§5.4).
 * Inventory (Phase 3) imports this module for `GetWarehouseUseCase`, a
 * directed, cycle-free dependency (docs/ARCHITECTURE.md §6) — Warehouses
 * itself has zero knowledge of Inventory.
 */
@Module({
  imports: [AuthModule, TenantsModule, AccessControlModule, AuditModule],
  controllers: [WarehousesController],
  providers: [
    { provide: WAREHOUSE_REPOSITORY, useClass: PrismaWarehouseRepository },
    CreateWarehouseUseCase,
    UpdateWarehouseUseCase,
    ListWarehousesUseCase,
    SetWarehouseStatusUseCase,
    GetWarehouseUseCase,
  ],
  exports: [CreateWarehouseUseCase, ListWarehousesUseCase, GetWarehouseUseCase],
})
export class WarehousesModule {}
