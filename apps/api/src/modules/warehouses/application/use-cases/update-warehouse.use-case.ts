import { Inject, Injectable } from "@nestjs/common";
import { Warehouse } from "../../domain/warehouse.entity";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "../../domain/warehouse.repository";
import { WarehouseNotFoundError } from "../errors";

export interface UpdateWarehouseInput {
  tenantId: string;
  companyId: string;
  id: string;
  name: string;
  addressLine?: string;
  city?: string;
  country?: string;
}

/**
 * Three-state contract for optional fields (omit → keep, "" → clear, value
 * → replace) — established by UpdateProductUseCase (catalog module) and
 * applied proactively here, same as Customer/Supplier.
 */
@Injectable()
export class UpdateWarehouseUseCase {
  constructor(@Inject(WAREHOUSE_REPOSITORY) private readonly warehouses: WarehouseRepository) {}

  async execute(input: UpdateWarehouseInput): Promise<Warehouse> {
    const warehouse = await this.warehouses.findById(input.tenantId, input.id);
    if (!warehouse || warehouse.companyId !== input.companyId) {
      throw new WarehouseNotFoundError();
    }
    warehouse.update(input.name, {
      addressLine: input.addressLine === undefined ? warehouse.addressLine : input.addressLine.trim() || null,
      city: input.city === undefined ? warehouse.city : input.city.trim() || null,
      country: input.country === undefined ? warehouse.country : input.country.trim() || null,
    });
    await this.warehouses.save(warehouse);
    return warehouse;
  }
}
