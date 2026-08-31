import { PriceListItem } from "./price-list-item.entity";

export interface PriceListItemRepository {
  findById(tenantId: string, id: string): Promise<PriceListItem | null>;
  findByProduct(tenantId: string, priceListId: string, productId: string): Promise<PriceListItem | null>;
  listByPriceList(tenantId: string, priceListId: string): Promise<PriceListItem[]>;
  save(item: PriceListItem): Promise<void>;
  remove(tenantId: string, id: string): Promise<void>;
}

export const PRICE_LIST_ITEM_REPOSITORY = Symbol("PRICE_LIST_ITEM_REPOSITORY");
