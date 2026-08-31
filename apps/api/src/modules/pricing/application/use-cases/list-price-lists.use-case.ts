import { Inject, Injectable } from "@nestjs/common";
import { PriceList } from "../../domain/price-list.entity";
import { PRICE_LIST_REPOSITORY, PriceListRepository } from "../../domain/price-list.repository";

@Injectable()
export class ListPriceListsUseCase {
  constructor(@Inject(PRICE_LIST_REPOSITORY) private readonly priceLists: PriceListRepository) {}

  async execute(tenantId: string, companyId: string): Promise<PriceList[]> {
    return this.priceLists.listByCompany(tenantId, companyId);
  }
}
