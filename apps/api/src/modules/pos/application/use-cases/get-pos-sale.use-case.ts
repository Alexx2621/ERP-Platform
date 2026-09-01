import { Inject, Injectable } from "@nestjs/common";
import { PosSale } from "../../domain/pos-sale.entity";
import { POS_SALE_REPOSITORY, PosSaleRepository } from "../../domain/pos-sale.repository";
import { PosSaleNotFoundError } from "../errors";

@Injectable()
export class GetPosSaleUseCase {
  constructor(@Inject(POS_SALE_REPOSITORY) private readonly posSales: PosSaleRepository) {}

  async execute(tenantId: string, companyId: string, id: string): Promise<PosSale> {
    const sale = await this.posSales.findById(tenantId, id);
    if (!sale || sale.companyId !== companyId) {
      throw new PosSaleNotFoundError();
    }
    return sale;
  }
}
