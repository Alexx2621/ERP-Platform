import { InventoryMovement } from "../domain/inventory-movement.entity";
import { InventoryMovementRepository, ListInventoryMovementsFilter } from "../domain/inventory-movement.repository";

export class InMemoryInventoryMovementRepository implements InventoryMovementRepository {
  readonly items: InventoryMovement[] = [];

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListInventoryMovementsFilter,
  ): Promise<InventoryMovement[]> {
    return this.items
      .filter(
        (m) =>
          m.tenantId === tenantId &&
          m.companyId === companyId &&
          (filter.warehouseId === undefined || m.warehouseId === filter.warehouseId) &&
          (filter.productId === undefined || m.productId === filter.productId) &&
          (filter.productVariantId === undefined || m.productVariantId === filter.productVariantId) &&
          (filter.referenceType === undefined || m.referenceType === filter.referenceType) &&
          (filter.referenceId === undefined || m.referenceId === filter.referenceId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  /** Test-only helper — production code never appends directly; see `InMemoryInventoryBalanceRepository.applyMovement`. */
  push(movement: InventoryMovement): void {
    this.items.push(movement);
  }
}
