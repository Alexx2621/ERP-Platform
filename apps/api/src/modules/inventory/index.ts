/** Public contract of the Inventory module. Other modules must only import from here. */
export { InventoryMovement, type InventoryMovementProps } from "./domain/inventory-movement.entity";
export { InventoryBalance, type InventoryBalanceProps } from "./domain/inventory-balance.entity";
export { InventoryTransfer, type InventoryTransferProps } from "./domain/inventory-transfer.entity";
export { InventoryReservation, type InventoryReservationProps } from "./domain/inventory-reservation.entity";
export { ListInventoryBalancesUseCase } from "./application/use-cases/list-inventory-balances.use-case";
export { ListInventoryMovementsUseCase } from "./application/use-cases/list-inventory-movements.use-case";
export { CreateReservationUseCase, type CreateReservationInput } from "./application/use-cases/create-reservation.use-case";
export { ReleaseReservationUseCase } from "./application/use-cases/release-reservation.use-case";
export { RecordIssueUseCase, type RecordIssueInput } from "./application/use-cases/record-issue.use-case";
export { RecordReturnUseCase, type RecordReturnInput } from "./application/use-cases/record-return.use-case";
export { RecordReceiptUseCase, type RecordReceiptInput } from "./application/use-cases/record-receipt.use-case";
export * from "./application/errors";
export { InventoryController } from "./presentation/inventory.controller";
export { InventoryModule } from "./inventory.module";
