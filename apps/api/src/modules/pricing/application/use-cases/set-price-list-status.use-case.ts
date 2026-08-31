import { Inject, Injectable } from "@nestjs/common";
import { MasterDataStatus, PriceList } from "../../domain/price-list.entity";
import { PRICE_LIST_REPOSITORY, PriceListRepository } from "../../domain/price-list.repository";
import { PriceListNotFoundError } from "../errors";

export interface SetPriceListStatusInput {
  tenantId: string;
  companyId: string;
  id: string;
  status: MasterDataStatus;
}

@Injectable()
export class SetPriceListStatusUseCase {
  constructor(@Inject(PRICE_LIST_REPOSITORY) private readonly priceLists: PriceListRepository) {}

  async execute(input: SetPriceListStatusInput): Promise<PriceList> {
    const priceList = await this.priceLists.findById(input.tenantId, input.id);
    if (!priceList || priceList.companyId !== input.companyId) {
      throw new PriceListNotFoundError();
    }
    priceList.setStatus(input.status);
    await this.priceLists.save(priceList);
    return priceList;
  }
}
