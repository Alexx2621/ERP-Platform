import { Module } from "@nestjs/common";
import { AuthModule } from "../../core/auth";
import { TenantsModule } from "../../core/tenants";
import { AccessControlModule } from "../../core/access-control";
import { AuditModule } from "../../core/audit";
import { AppRegistryModule } from "../../core/app-registry";
import { CUSTOMER_REPOSITORY } from "./domain/customer.repository";
import { PrismaCustomerRepository } from "./infrastructure/prisma-customer.repository";
import { CreateCustomerUseCase } from "./application/use-cases/create-customer.use-case";
import { UpdateCustomerUseCase } from "./application/use-cases/update-customer.use-case";
import { ListCustomersUseCase } from "./application/use-cases/list-customers.use-case";
import { SetCustomerStatusUseCase } from "./application/use-cases/set-customer-status.use-case";
import { GetCustomerUseCase } from "./application/use-cases/get-customer.use-case";
import { FindCustomerByEmailUseCase } from "./application/use-cases/find-customer-by-email.use-case";
import { CustomersController } from "./presentation/customers.controller";

/**
 * Phase 2 (Master Data) module — sibling of Catalog, deliberately outside
 * `core/` (docs/ARCHITECTURE.md §5.3-§5.4). Sales (Phase 4) imports this
 * module for `GetCustomerUseCase`, a directed, cycle-free dependency
 * (docs/ARCHITECTURE.md §6) — Customers itself has zero knowledge of Sales.
 */
@Module({
  imports: [AuthModule, TenantsModule, AccessControlModule, AuditModule, AppRegistryModule],
  controllers: [CustomersController],
  providers: [
    { provide: CUSTOMER_REPOSITORY, useClass: PrismaCustomerRepository },
    CreateCustomerUseCase,
    UpdateCustomerUseCase,
    ListCustomersUseCase,
    SetCustomerStatusUseCase,
    GetCustomerUseCase,
    FindCustomerByEmailUseCase,
  ],
  exports: [CreateCustomerUseCase, ListCustomersUseCase, GetCustomerUseCase, FindCustomerByEmailUseCase],
})
export class CustomersModule {}
