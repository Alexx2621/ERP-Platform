import { Inject, Injectable } from "@nestjs/common";
import { PRICE_LIST_ITEM_REPOSITORY, PriceListItemRepository } from "../../domain/price-list-item.repository";
import { PRICE_LIST_REPOSITORY, PriceListRepository } from "../../domain/price-list.repository";
import { PriceListItemNotFoundError, PriceListNotFoundError } from "../errors";

export interface RemovePriceListItemInput {
  tenantId: string;
  companyId: string;
  priceListId: string;
  itemId: string;
}

/** Hard delete — a price list line has no lifecycle of its own the way a standalone master-data entity does (see the schema.prisma docstring on `PriceListItem`). */
@Injectable()
export class RemovePriceListItemUseCase {
  constructor(
    @Inject(PRICE_LIST_REPOSITORY) private readonly priceLists: PriceListRepository,
    @Inject(PRICE_LIST_ITEM_REPOSITORY) private readonly items: PriceListItemRepository,
  ) {}

  async execute(input: RemovePriceListItemInput): Promise<void> {
    const priceList = await this.priceLists.findById(input.tenantId, input.priceListId);
    if (!priceList || priceList.companyId !== input.companyId) {
      throw new PriceListNotFoundError();
    }

    const item = await this.items.findById(input.tenantId, input.itemId);
    if (!item || item.priceListId !== input.priceListId) {
      throw new PriceListItemNotFoundError();
    }

    await this.items.remove(input.tenantId, input.itemId);
  }
}
