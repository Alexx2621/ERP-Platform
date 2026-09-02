/** Public contract of the Customers module. Other modules must only import from here. */
export { Customer, type CustomerProps } from "./domain/customer.entity";
export { CreateCustomerUseCase } from "./application/use-cases/create-customer.use-case";
export { ListCustomersUseCase } from "./application/use-cases/list-customers.use-case";
export { GetCustomerUseCase } from "./application/use-cases/get-customer.use-case";
export { FindCustomerByEmailUseCase } from "./application/use-cases/find-customer-by-email.use-case";
export * from "./application/errors";
export { CustomersController } from "./presentation/customers.controller";
export { CustomersModule } from "./customers.module";
