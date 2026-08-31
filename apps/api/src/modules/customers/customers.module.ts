import { Module } from "@nestjs/common";
import { AuthModule } from "../../core/auth";
import { TenantsModule } from "../../core/tenants";
import { AccessControlModule } from "../../core/access-control";
import { AuditModule } from "../../core/audit";
import { CUSTOMER_REPOSITORY } from "./domain/customer.repository";
import { PrismaCustomerRepository } from "./infrastructure/prisma-customer.repository";
import { CreateCustomerUseCase } from "./application/use-cases/create-customer.use-case";
import { UpdateCustomerUseCase } from "./application/use-cases/update-customer.use-case";
import { ListCustomersUseCase } from "./application/use-cases/list-customers.use-case";
import { SetCustomerStatusUseCase } from "./application/use-cases/set-customer-status.use-case";
import { CustomersController } from "./presentation/customers.controller";

/**
 * Phase 2 (Master Data) module — sibling of Catalog, deliberately outside
 * `core/` (docs/ARCHITECTURE.md §5.3-§5.4). Nothing depends on Customers, so
 * — like Catalog/Configuration/Files — there is no module-loading cycle risk.
 */
@Module({
  imports: [AuthModule, TenantsModule, AccessControlModule, AuditModule],
  controllers: [CustomersController],
  providers: [
    { provide: CUSTOMER_REPOSITORY, useClass: PrismaCustomerRepository },
    CreateCustomerUseCase,
    UpdateCustomerUseCase,
    ListCustomersUseCase,
    SetCustomerStatusUseCase,
  ],
  exports: [CreateCustomerUseCase, ListCustomersUseCase],
})
export class CustomersModule {}
