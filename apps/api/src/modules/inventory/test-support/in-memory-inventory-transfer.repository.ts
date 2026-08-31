import { InventoryTransfer } from "../domain/inventory-transfer.entity";
import { InventoryTransferRepository, ListInventoryTransfersFilter } from "../domain/inventory-transfer.repository";

export class InMemoryInventoryTransferRepository implements InventoryTransferRepository {
  private readonly byId = new Map<string, InventoryTransfer>();

  async findById(tenantId: string, id: string): Promise<InventoryTransfer | null> {
    const transfer = this.byId.get(id);
    return transfer && transfer.tenantId === tenantId ? transfer : null;
  }

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListInventoryTransfersFilter,
  ): Promise<InventoryTransfer[]> {
    return [...this.byId.values()]
      .filter(
        (t) =>
          t.tenantId === tenantId &&
          t.companyId === companyId &&
          (filter.status === undefined || t.status === filter.status) &&
          (filter.productId === undefined || t.productId === filter.productId) &&
          (filter.warehouseId === undefined ||
            t.sourceWarehouseId === filter.warehouseId ||
            t.destinationWarehouseId === filter.warehouseId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async save(transfer: InventoryTransfer): Promise<void> {
    this.byId.set(transfer.id, transfer);
  }
}
