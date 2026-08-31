import { UnitOfMeasure } from "../domain/unit-of-measure.entity";
import { UnitOfMeasureRepository } from "../domain/unit-of-measure.repository";

export class InMemoryUnitOfMeasureRepository implements UnitOfMeasureRepository {
  private readonly byId = new Map<string, UnitOfMeasure>();

  async findById(tenantId: string, id: string): Promise<UnitOfMeasure | null> {
    const unit = this.byId.get(id);
    return unit && unit.tenantId === tenantId ? unit : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<UnitOfMeasure | null> {
    return (
      [...this.byId.values()].find(
        (u) => u.tenantId === tenantId && u.companyId === companyId && u.code === code,
      ) ?? null
    );
  }

  async listByCompany(tenantId: string, companyId: string): Promise<UnitOfMeasure[]> {
    return [...this.byId.values()].filter((u) => u.tenantId === tenantId && u.companyId === companyId);
  }

  async save(unitOfMeasure: UnitOfMeasure): Promise<void> {
    this.byId.set(unitOfMeasure.id, unitOfMeasure);
  }
}
