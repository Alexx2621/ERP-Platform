import { Inject, Injectable } from "@nestjs/common";
import { PriceListItem } from "../../domain/price-list-item.entity";
import { PRICE_LIST_ITEM_REPOSITORY, PriceListItemRepository } from "../../domain/price-list-item.repository";

/** Cross-module read boundary (docs/ARCHITECTURE.md §6) — resolves a product's price-list snapshot for Sales. */
@Injectable()
export class GetPriceListItemUseCase {
  constructor(@Inject(PRICE_LIST_ITEM_REPOSITORY) private readonly items: PriceListItemRepository) {}

  async execute(tenantId: string, priceListId: string, productId: string): Promise<PriceListItem | null> {
    return this.items.findByProduct(tenantId, priceListId, productId);
  }
}
