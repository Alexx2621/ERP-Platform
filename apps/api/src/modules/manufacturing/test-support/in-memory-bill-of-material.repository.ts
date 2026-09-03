import { BillOfMaterial } from "../domain/bill-of-material.entity";
import { BillOfMaterialRepository, ListBillOfMaterialsFilter } from "../domain/bill-of-material.repository";

export class InMemoryBillOfMaterialRepository implements BillOfMaterialRepository {
  private readonly byId = new Map<string, BillOfMaterial>();

  async findById(tenantId: string, id: string): Promise<BillOfMaterial | null> {
    const bom = this.byId.get(id);
    return bom && bom.tenantId === tenantId ? bom : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<BillOfMaterial | null> {
    return (
      [...this.byId.values()].find(
        (b) => b.tenantId === tenantId && b.companyId === companyId && b.code === code,
      ) ?? null
    );
  }

  async countByProduct(tenantId: string, companyId: string, productId: string): Promise<number> {
    return [...this.byId.values()].filter(
      (b) => b.tenantId === tenantId && b.companyId === companyId && b.productId === productId,
    ).length;
  }

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListBillOfMaterialsFilter,
  ): Promise<BillOfMaterial[]> {
    return [...this.byId.values()]
      .filter(
        (b) =>
          b.tenantId === tenantId &&
          b.companyId === companyId &&
          (filter.productId === undefined || b.productId === filter.productId) &&
          (filter.status === undefined || b.status === filter.status),
      )
      .sort((a, b) => b.version - a.version)
      .slice(0, filter.limit);
  }

  async save(billOfMaterial: BillOfMaterial): Promise<void> {
    this.byId.set(billOfMaterial.id, billOfMaterial);
  }
}
