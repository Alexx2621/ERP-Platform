import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { PriceList } from "../../domain/price-list.entity";
import { PRICE_LIST_REPOSITORY, PriceListRepository } from "../../domain/price-list.repository";
import { PriceListCodeAlreadyInUseError } from "../errors";

export interface CreatePriceListInput {
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  currency: string;
  validFrom?: string;
  validUntil?: string;
}

@Injectable()
export class CreatePriceListUseCase {
  constructor(@Inject(PRICE_LIST_REPOSITORY) private readonly priceLists: PriceListRepository) {}

  async execute(input: CreatePriceListInput): Promise<PriceList> {
    const code = input.code.trim();
    const existing = await this.priceLists.findByCode(input.tenantId, input.companyId, code);
    if (existing) {
      throw new PriceListCodeAlreadyInUseError(code);
    }

    const now = new Date();
    const priceList = PriceList.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      code,
      name: input.name,
      currency: input.currency,
      validFrom: input.validFrom ? new Date(input.validFrom) : null,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.priceLists.save(priceList);
    return priceList;
  }
}
