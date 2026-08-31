import { PriceList } from "../domain/price-list.entity";
import { PriceListRepository } from "../domain/price-list.repository";

export class InMemoryPriceListRepository implements PriceListRepository {
  private readonly byId = new Map<string, PriceList>();

  async findById(tenantId: string, id: string): Promise<PriceList | null> {
    const priceList = this.byId.get(id);
    return priceList && priceList.tenantId === tenantId ? priceList : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<PriceList | null> {
    return (
      [...this.byId.values()].find(
        (p) => p.tenantId === tenantId && p.companyId === companyId && p.code === code,
      ) ?? null
    );
  }

  async listByCompany(tenantId: string, companyId: string): Promise<PriceList[]> {
    return [...this.byId.values()].filter((p) => p.tenantId === tenantId && p.companyId === companyId);
  }

  async save(priceList: PriceList): Promise<void> {
    this.byId.set(priceList.id, priceList);
  }
}
