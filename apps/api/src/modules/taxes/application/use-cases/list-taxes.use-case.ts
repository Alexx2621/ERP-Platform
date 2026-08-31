import { Inject, Injectable } from "@nestjs/common";
import { Tax } from "../../domain/tax.entity";
import { TAX_REPOSITORY, TaxRepository } from "../../domain/tax.repository";

@Injectable()
export class ListTaxesUseCase {
  constructor(@Inject(TAX_REPOSITORY) private readonly taxes: TaxRepository) {}

  async execute(tenantId: string, companyId: string): Promise<Tax[]> {
    return this.taxes.listByCompany(tenantId, companyId);
  }
}
