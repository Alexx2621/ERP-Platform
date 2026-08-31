/** Public contract of the Suppliers module. Other modules must only import from here. */
export { Supplier, type SupplierProps } from "./domain/supplier.entity";
export { CreateSupplierUseCase } from "./application/use-cases/create-supplier.use-case";
export { ListSuppliersUseCase } from "./application/use-cases/list-suppliers.use-case";
export * from "./application/errors";
export { SuppliersController } from "./presentation/suppliers.controller";
export { SuppliersModule } from "./suppliers.module";
