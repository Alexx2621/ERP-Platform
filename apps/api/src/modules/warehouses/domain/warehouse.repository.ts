import { Warehouse } from "./warehouse.entity";

export interface WarehouseRepository {
  findById(tenantId: string, id: string): Promise<Warehouse | null>;
  findByCode(tenantId: string, companyId: string, code: string): Promise<Warehouse | null>;
  listByCompany(tenantId: string, companyId: string): Promise<Warehouse[]>;
  save(warehouse: Warehouse): Promise<void>;
}

export const WAREHOUSE_REPOSITORY = Symbol("WAREHOUSE_REPOSITORY");
