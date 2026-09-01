import { Inject, Injectable } from "@nestjs/common";
import { PosSale } from "../../domain/pos-sale.entity";
import { ListPosSalesFilter, POS_SALE_REPOSITORY, PosSaleRepository } from "../../domain/pos-sale.repository";

export interface ListPosSalesInput {
  tenantId: string;
  companyId: string;
  filter: ListPosSalesFilter;
}

@Injectable()
export class ListPosSalesUseCase {
  constructor(@Inject(POS_SALE_REPOSITORY) private readonly posSales: PosSaleRepository) {}

  async execute(input: ListPosSalesInput): Promise<PosSale[]> {
    return this.posSales.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
