import { PriceListItem } from "../domain/price-list-item.entity";
import { PriceListItemRepository } from "../domain/price-list-item.repository";

export class InMemoryPriceListItemRepository implements PriceListItemRepository {
  private readonly byId = new Map<string, PriceListItem>();

  async findById(tenantId: string, id: string): Promise<PriceListItem | null> {
    const item = this.byId.get(id);
    return item && item.tenantId === tenantId ? item : null;
  }

  async findByProduct(tenantId: string, priceListId: string, productId: string): Promise<PriceListItem | null> {
    return (
      [...this.byId.values()].find(
        (i) => i.tenantId === tenantId && i.priceListId === priceListId && i.productId === productId,
      ) ?? null
    );
  }

  async listByPriceList(tenantId: string, priceListId: string): Promise<PriceListItem[]> {
    return [...this.byId.values()].filter((i) => i.tenantId === tenantId && i.priceListId === priceListId);
  }

  async save(item: PriceListItem): Promise<void> {
    this.byId.set(item.id, item);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const item = this.byId.get(id);
    if (item && item.tenantId === tenantId) {
      this.byId.delete(id);
    }
  }
}
