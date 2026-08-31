import { Inject, Injectable } from "@nestjs/common";
import { PriceList } from "../../domain/price-list.entity";
import { PRICE_LIST_REPOSITORY, PriceListRepository } from "../../domain/price-list.repository";
import { PriceListNotFoundError } from "../errors";

export interface UpdatePriceListInput {
  tenantId: string;
  companyId: string;
  id: string;
  name: string;
  currency: string;
  /** Omit to keep, "" to clear, an ISO date (YYYY-MM-DD) to replace. */
  validFrom?: string;
  validUntil?: string;
}

/**
 * `currency` is always required on update (a price list's currency should
 * never silently fall back to a prior value the caller didn't intend), but
 * `validFrom`/`validUntil` use the three-state contract (omit → keep, ""
 * → clear, value → replace) established by UpdateProductUseCase.
 */
@Injectable()
export class UpdatePriceListUseCase {
  constructor(@Inject(PRICE_LIST_REPOSITORY) private readonly priceLists: PriceListRepository) {}

  async execute(input: UpdatePriceListInput): Promise<PriceList> {
    const priceList = await this.priceLists.findById(input.tenantId, input.id);
    if (!priceList || priceList.companyId !== input.companyId) {
      throw new PriceListNotFoundError();
    }

    const validFrom =
      input.validFrom === undefined ? priceList.validFrom : input.validFrom ? new Date(input.validFrom) : null;
    const validUntil =
      input.validUntil === undefined ? priceList.validUntil : input.validUntil ? new Date(input.validUntil) : null;

    priceList.update(input.name, { currency: input.currency, validFrom, validUntil });
    await this.priceLists.save(priceList);
    return priceList;
  }
}
