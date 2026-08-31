import { Inject, Injectable } from "@nestjs/common";
import { Warehouse } from "../../domain/warehouse.entity";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "../../domain/warehouse.repository";

/**
 * Same shape as Catalog's `GetProductUseCase` — the cross-module read
 * boundary Inventory uses to verify a warehouse exists and belongs to the
 * active company before posting any movement against it
 * (docs/ARCHITECTURE.md §6: "module A -> public contract of module B").
 */
@Injectable()
export class GetWarehouseUseCase {
  constructor(@Inject(WAREHOUSE_REPOSITORY) private readonly warehouses: WarehouseRepository) {}

  async execute(tenantId: string, id: string): Promise<Warehouse | null> {
    return this.warehouses.findById(tenantId, id);
  }
}
