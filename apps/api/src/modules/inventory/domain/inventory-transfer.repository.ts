import { InventoryTransfer, InventoryTransferStatus } from "./inventory-transfer.entity";

export interface ListInventoryTransfersFilter {
  warehouseId?: string;
  productId?: string;
  status?: InventoryTransferStatus;
  limit: number;
}

export interface InventoryTransferRepository {
  findById(tenantId: string, id: string): Promise<InventoryTransfer | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListInventoryTransfersFilter): Promise<InventoryTransfer[]>;
  save(transfer: InventoryTransfer): Promise<void>;
}

export const INVENTORY_TRANSFER_REPOSITORY = Symbol("INVENTORY_TRANSFER_REPOSITORY");
