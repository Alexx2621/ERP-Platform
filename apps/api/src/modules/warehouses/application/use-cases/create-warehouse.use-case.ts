import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { Warehouse } from "../../domain/warehouse.entity";
import { WAREHOUSE_REPOSITORY, WarehouseRepository } from "../../domain/warehouse.repository";
import { WarehouseCodeAlreadyInUseError } from "../errors";

export interface CreateWarehouseInput {
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  addressLine?: string;
  city?: string;
  country?: string;
}

@Injectable()
export class CreateWarehouseUseCase {
  constructor(@Inject(WAREHOUSE_REPOSITORY) private readonly warehouses: WarehouseRepository) {}

  async execute(input: CreateWarehouseInput): Promise<Warehouse> {
    const code = input.code.trim();
    const existing = await this.warehouses.findByCode(input.tenantId, input.companyId, code);
    if (existing) {
      throw new WarehouseCodeAlreadyInUseError(code);
    }

    const now = new Date();
    const warehouse = Warehouse.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      code,
      name: input.name,
      addressLine: input.addressLine?.trim() || null,
      city: input.city?.trim() || null,
      country: input.country?.trim() || null,
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.warehouses.save(warehouse);
    return warehouse;
  }
}
