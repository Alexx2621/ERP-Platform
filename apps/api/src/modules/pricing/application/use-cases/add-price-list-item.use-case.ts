import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { GetProductUseCase } from "../../../catalog";
import { PriceListItem } from "../../domain/price-list-item.entity";
import { PRICE_LIST_ITEM_REPOSITORY, PriceListItemRepository } from "../../domain/price-list-item.repository";
import { PRICE_LIST_REPOSITORY, PriceListRepository } from "../../domain/price-list.repository";
import {
  PriceListItemAlreadyExistsError,
  PriceListItemProductHasVariantsError,
  PriceListItemProductNotFoundError,
  PriceListNotFoundError,
} from "../errors";

export interface AddPriceListItemInput {
  tenantId: string;
  companyId: string;
  priceListId: string;
  productId: string;
  price: string;
}

/**
 * The first genuine cross-module use case in this codebase: validates
 * `productId` via Catalog's own `GetProductUseCase` (its public contract,
 * not its repository — docs/ARCHITECTURE.md §6). Rejects `hasVariants`
 * products — see the schema.prisma docstring on `PriceListItem` for why
 * per-variant list pricing is out of scope for this slice.
 */
@Injectable()
export class AddPriceListItemUseCase {
  constructor(
    @Inject(PRICE_LIST_REPOSITORY) private readonly priceLists: PriceListRepository,
    @Inject(PRICE_LIST_ITEM_REPOSITORY) private readonly items: PriceListItemRepository,
    private readonly getProduct: GetProductUseCase,
  ) {}

  async execute(input: AddPriceListItemInput): Promise<PriceListItem> {
    const priceList = await this.priceLists.findById(input.tenantId, input.priceListId);
    if (!priceList || priceList.companyId !== input.companyId) {
      throw new PriceListNotFoundError();
    }

    const product = await this.getProduct.execute(input.tenantId, input.productId);
    if (!product || product.companyId !== input.companyId) {
      throw new PriceListItemProductNotFoundError();
    }
    if (product.hasVariants) {
      throw new PriceListItemProductHasVariantsError();
    }

    const existing = await this.items.findByProduct(input.tenantId, input.priceListId, input.productId);
    if (existing) {
      throw new PriceListItemAlreadyExistsError();
    }

    const now = new Date();
    const item = PriceListItem.create({
      id: newId(),
      tenantId: input.tenantId,
      priceListId: input.priceListId,
      productId: input.productId,
      price: input.price,
      createdAt: now,
      updatedAt: now,
    });
    await this.items.save(item);
    return item;
  }
}
