import { Inject, Injectable } from "@nestjs/common";
import { MasterDataStatus, Warehouse } from "../../domain/warehouse.entity";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "../../domain/warehouse.repository";
import { WarehouseNotFoundError } from "../errors";

export interface SetWarehouseStatusInput {
  tenantId: string;
  companyId: string;
  id: string;
  status: MasterDataStatus;
}

@Injectable()
export class SetWarehouseStatusUseCase {
  constructor(@Inject(WAREHOUSE_REPOSITORY) private readonly warehouses: WarehouseRepository) {}

  async execute(input: SetWarehouseStatusInput): Promise<Warehouse> {
    const warehouse = await this.warehouses.findById(input.tenantId, input.id);
    if (!warehouse || warehouse.companyId !== input.companyId) {
      throw new WarehouseNotFoundError();
    }
    warehouse.setStatus(input.status);
    await this.warehouses.save(warehouse);
    return warehouse;
  }
}
