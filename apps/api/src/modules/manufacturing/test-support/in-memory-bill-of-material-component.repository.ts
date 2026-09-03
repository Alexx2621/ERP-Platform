import { BillOfMaterialComponent } from "../domain/bill-of-material-component.entity";
import { BillOfMaterialComponentRepository } from "../domain/bill-of-material-component.repository";

export class InMemoryBillOfMaterialComponentRepository implements BillOfMaterialComponentRepository {
  private readonly byId = new Map<string, BillOfMaterialComponent>();

  async listByBillOfMaterial(tenantId: string, billOfMaterialId: string): Promise<BillOfMaterialComponent[]> {
    return [...this.byId.values()]
      .filter((c) => c.tenantId === tenantId && c.billOfMaterialId === billOfMaterialId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async save(component: BillOfMaterialComponent): Promise<void> {
    this.byId.set(component.id, component);
  }
}
