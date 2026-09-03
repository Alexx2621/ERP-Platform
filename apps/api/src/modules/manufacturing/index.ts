/** Public contract of the Manufacturing module. Other modules must only import from here. */
export { BillOfMaterial, type BillOfMaterialProps, type BillOfMaterialStatus } from "./domain/bill-of-material.entity";
export {
  BillOfMaterialComponent,
  type BillOfMaterialComponentProps,
} from "./domain/bill-of-material-component.entity";
export { ProductionOrder, type ProductionOrderProps, type ProductionOrderStatus } from "./domain/production-order.entity";
export { ProductionOrderMaterial, type ProductionOrderMaterialProps } from "./domain/production-order-material.entity";
export {
  ProductionOrderMaterialMovement,
  type ProductionOrderMaterialMovementProps,
  type ProductionOrderMaterialMovementType,
} from "./domain/production-order-material-movement.entity";
export { ProductionOrderOperation, type ProductionOrderOperationProps } from "./domain/production-order-operation.entity";
export {
  ProductionOrderFinishedGoodsReceipt,
  type ProductionOrderFinishedGoodsReceiptProps,
} from "./domain/production-order-finished-goods-receipt.entity";
export { CreateBillOfMaterialUseCase } from "./application/use-cases/create-bill-of-material.use-case";
export { SetBillOfMaterialStatusUseCase } from "./application/use-cases/set-bill-of-material-status.use-case";
export { CreateProductionOrderUseCase } from "./application/use-cases/create-production-order.use-case";
export { ConfirmProductionOrderUseCase } from "./application/use-cases/confirm-production-order.use-case";
export { CloseProductionOrderUseCase } from "./application/use-cases/close-production-order.use-case";
export { CancelProductionOrderUseCase } from "./application/use-cases/cancel-production-order.use-case";
export { IssueProductionOrderMaterialUseCase } from "./application/use-cases/issue-production-order-material.use-case";
export { ReturnProductionOrderMaterialUseCase } from "./application/use-cases/return-production-order-material.use-case";
export { RecordFinishedGoodsUseCase } from "./application/use-cases/record-finished-goods.use-case";
export { ListProductionOrdersUseCase } from "./application/use-cases/list-production-orders.use-case";
export { GetProductionOrderUseCase } from "./application/use-cases/get-production-order.use-case";
export * from "./application/errors";
export { BillsOfMaterialController } from "./presentation/bills-of-material.controller";
export { ProductionOrdersController } from "./presentation/production-orders.controller";
export { ManufacturingModule } from "./manufacturing.module";
