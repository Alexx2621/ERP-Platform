import { Inject, Injectable } from "@nestjs/common";
import { PriceListItem } from "../../domain/price-list-item.entity";
import { PRICE_LIST_ITEM_REPOSITORY, PriceListItemRepository } from "../../domain/price-list-item.repository";
import { PRICE_LIST_REPOSITORY, PriceListRepository } from "../../domain/price-list.repository";
import { PriceListItemNotFoundError, PriceListNotFoundError } from "../errors";

export interface UpdatePriceListItemInput {
  tenantId: string;
  companyId: string;
  priceListId: string;
  itemId: string;
  price: string;
}

@Injectable()
export class UpdatePriceListItemUseCase {
  constructor(
    @Inject(PRICE_LIST_REPOSITORY) private readonly priceLists: PriceListRepository,
    @Inject(PRICE_LIST_ITEM_REPOSITORY) private readonly items: PriceListItemRepository,
  ) {}

  async execute(input: UpdatePriceListItemInput): Promise<PriceListItem> {
    const priceList = await this.priceLists.findById(input.tenantId, input.priceListId);
    if (!priceList || priceList.companyId !== input.companyId) {
      throw new PriceListNotFoundError();
    }

    const item = await this.items.findById(input.tenantId, input.itemId);
    if (!item || item.priceListId !== input.priceListId) {
      throw new PriceListItemNotFoundError();
    }

    item.reprice(input.price);
    await this.items.save(item);
    return item;
  }
}
