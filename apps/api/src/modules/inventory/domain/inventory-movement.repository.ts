import { InventoryMovement, InventoryMovementReferenceType } from "./inventory-movement.entity";

export interface ListInventoryMovementsFilter {
  warehouseId?: string;
  productId?: string;
  productVariantId?: string;
  referenceType?: InventoryMovementReferenceType;
  referenceId?: string;
  limit: number;
}

/**
 * Read-only from the application layer's point of view — every write to
 * `inventory_movements` happens exclusively inside
 * `InventoryBalanceRepository.applyMovement`, which inserts the movement
 * row and updates the balance row in the same locked transaction. There is
 * deliberately no `save`/`create` method here.
 */
export interface InventoryMovementRepository {
  listByCompany(tenantId: string, companyId: string, filter: ListInventoryMovementsFilter): Promise<InventoryMovement[]>;
}

export const INVENTORY_MOVEMENT_REPOSITORY = Symbol("INVENTORY_MOVEMENT_REPOSITORY");
