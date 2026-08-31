import { PriceList } from "./price-list.entity";

export interface PriceListRepository {
  findById(tenantId: string, id: string): Promise<PriceList | null>;
  findByCode(tenantId: string, companyId: string, code: string): Promise<PriceList | null>;
  listByCompany(tenantId: string, companyId: string): Promise<PriceList[]>;
  save(priceList: PriceList): Promise<void>;
}

export const PRICE_LIST_REPOSITORY = Symbol("PRICE_LIST_REPOSITORY");
