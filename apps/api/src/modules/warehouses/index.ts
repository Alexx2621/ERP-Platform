/** Public contract of the Warehouses module. Other modules must only import from here. */
export { Warehouse, type WarehouseProps } from "./domain/warehouse.entity";
export { CreateWarehouseUseCase } from "./application/use-cases/create-warehouse.use-case";
export { ListWarehousesUseCase } from "./application/use-cases/list-warehouses.use-case";
export * from "./application/errors";
export { WarehousesController } from "./presentation/warehouses.controller";
export { WarehousesModule } from "./warehouses.module";
