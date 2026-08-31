import { Injectable } from "@nestjs/common";
import { GetWarehouseUseCase } from "../../../warehouses";
import { WarehouseNotFoundError } from "../errors";

/**
 * Verifies a warehouse exists and belongs to the active company before any
 * movement is posted against it. Shared by every write use case in this
 * module (docs/ARCHITECTURE.md §6: Inventory -> public contract of
 * Warehouses, a directed, cycle-free dependency).
 */
@Injectable()
export class ResolveWarehouseTargetUseCase {
  constructor(private readonly getWarehouse: GetWarehouseUseCase) {}

  async execute(tenantId: string, companyId: string, warehouseId: string): Promise<void> {
    const warehouse = await this.getWarehouse.execute(tenantId, warehouseId);
    if (!warehouse || warehouse.companyId !== companyId) {
      throw new WarehouseNotFoundError();
    }
  }
}
