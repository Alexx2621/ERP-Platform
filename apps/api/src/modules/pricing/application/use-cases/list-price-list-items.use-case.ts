import { Inject, Injectable } from "@nestjs/common";
import { PriceListItem } from "../../domain/price-list-item.entity";
import { PRICE_LIST_ITEM_REPOSITORY, PriceListItemRepository } from "../../domain/price-list-item.repository";
import { PRICE_LIST_REPOSITORY, PriceListRepository } from "../../domain/price-list.repository";
import { PriceListNotFoundError } from "../errors";

export interface ListPriceListItemsInput {
  tenantId: string;
  companyId: string;
  priceListId: string;
}

@Injectable()
export class ListPriceListItemsUseCase {
  constructor(
    @Inject(PRICE_LIST_REPOSITORY) private readonly priceLists: PriceListRepository,
    @Inject(PRICE_LIST_ITEM_REPOSITORY) private readonly items: PriceListItemRepository,
  ) {}

  async execute(input: ListPriceListItemsInput): Promise<PriceListItem[]> {
    const priceList = await this.priceLists.findById(input.tenantId, input.priceListId);
    if (!priceList || priceList.companyId !== input.companyId) {
      throw new PriceListNotFoundError();
    }
    return this.items.listByPriceList(input.tenantId, input.priceListId);
  }
}
