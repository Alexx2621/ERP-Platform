import { Module } from "@nestjs/common";
import { AuthModule } from "../../core/auth";
import { TenantsModule } from "../../core/tenants";
import { AccessControlModule } from "../../core/access-control";
import { AuditModule } from "../../core/audit";
import { SUPPLIER_REPOSITORY } from "./domain/supplier.repository";
import { PrismaSupplierRepository } from "./infrastructure/prisma-supplier.repository";
import { CreateSupplierUseCase } from "./application/use-cases/create-supplier.use-case";
import { UpdateSupplierUseCase } from "./application/use-cases/update-supplier.use-case";
import { ListSuppliersUseCase } from "./application/use-cases/list-suppliers.use-case";
import { SetSupplierStatusUseCase } from "./application/use-cases/set-supplier-status.use-case";
import { SuppliersController } from "./presentation/suppliers.controller";

/**
 * Phase 2 (Master Data) module — sibling of Customers/Catalog, deliberately
 * outside `core/` (docs/ARCHITECTURE.md §5.3-§5.4). Nothing depends on
 * Suppliers, so there is no module-loading cycle risk.
 */
@Module({
  imports: [AuthModule, TenantsModule, AccessControlModule, AuditModule],
  controllers: [SuppliersController],
  providers: [
    { provide: SUPPLIER_REPOSITORY, useClass: PrismaSupplierRepository },
    CreateSupplierUseCase,
    UpdateSupplierUseCase,
    ListSuppliersUseCase,
    SetSupplierStatusUseCase,
  ],
  exports: [CreateSupplierUseCase, ListSuppliersUseCase],
})
export class SuppliersModule {}
