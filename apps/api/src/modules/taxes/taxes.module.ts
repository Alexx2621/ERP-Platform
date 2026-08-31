import { Module } from "@nestjs/common";
import { AuthModule } from "../../core/auth";
import { TenantsModule } from "../../core/tenants";
import { AccessControlModule } from "../../core/access-control";
import { AuditModule } from "../../core/audit";
import { TAX_REPOSITORY } from "./domain/tax.repository";
import { PrismaTaxRepository } from "./infrastructure/prisma-tax.repository";
import { CreateTaxUseCase } from "./application/use-cases/create-tax.use-case";
import { UpdateTaxUseCase } from "./application/use-cases/update-tax.use-case";
import { ListTaxesUseCase } from "./application/use-cases/list-taxes.use-case";
import { SetTaxStatusUseCase } from "./application/use-cases/set-tax-status.use-case";
import { TaxesController } from "./presentation/taxes.controller";

/**
 * Phase 2 (Master Data) module — sibling of Catalog/Customers/Suppliers,
 * deliberately outside `core/` (docs/ARCHITECTURE.md §5.3-§5.4). Nothing
 * depends on Taxes, so there is no module-loading cycle risk.
 */
@Module({
  imports: [AuthModule, TenantsModule, AccessControlModule, AuditModule],
  controllers: [TaxesController],
  providers: [
    { provide: TAX_REPOSITORY, useClass: PrismaTaxRepository },
    CreateTaxUseCase,
    UpdateTaxUseCase,
    ListTaxesUseCase,
    SetTaxStatusUseCase,
  ],
  exports: [CreateTaxUseCase, ListTaxesUseCase],
})
export class TaxesModule {}
