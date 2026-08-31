import { Warehouse } from "../domain/warehouse.entity";
import { WarehouseRepository } from "../domain/warehouse.repository";

export class InMemoryWarehouseRepository implements WarehouseRepository {
  private readonly byId = new Map<string, Warehouse>();

  async findById(tenantId: string, id: string): Promise<Warehouse | null> {
    const warehouse = this.byId.get(id);
    return warehouse && warehouse.tenantId === tenantId ? warehouse : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<Warehouse | null> {
    return (
      [...this.byId.values()].find(
        (w) => w.tenantId === tenantId && w.companyId === companyId && w.code === code,
      ) ?? null
    );
  }

  async listByCompany(tenantId: string, companyId: string): Promise<Warehouse[]> {
    return [...this.byId.values()].filter((w) => w.tenantId === tenantId && w.companyId === companyId);
  }

  async save(warehouse: Warehouse): Promise<void> {
    this.byId.set(warehouse.id, warehouse);
  }
}
