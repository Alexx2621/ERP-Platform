import { Inject, Injectable } from "@nestjs/common";
import { Warehouse } from "../../domain/warehouse.entity";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "../../domain/warehouse.repository";

@Injectable()
export class ListWarehousesUseCase {
  constructor(@Inject(WAREHOUSE_REPOSITORY) private readonly warehouses: WarehouseRepository) {}

  async execute(tenantId: string, companyId: string): Promise<Warehouse[]> {
    return this.warehouses.listByCompany(tenantId, companyId);
  }
}
