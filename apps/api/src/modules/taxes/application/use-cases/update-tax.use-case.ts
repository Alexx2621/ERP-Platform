import { Inject, Injectable } from "@nestjs/common";
import { Tax } from "../../domain/tax.entity";
import { TAX_REPOSITORY, TaxRepository } from "../../domain/tax.repository";
import { TaxNotFoundError } from "../errors";

export interface UpdateTaxInput {
  tenantId: string;
  companyId: string;
  id: string;
  name: string;
  rate: string;
}

/** "Not found" and "belongs to a different company" both surface as TaxNotFoundError — same IDOR-resistant pattern used across this codebase. */
@Injectable()
export class UpdateTaxUseCase {
  constructor(@Inject(TAX_REPOSITORY) private readonly taxes: TaxRepository) {}

  async execute(input: UpdateTaxInput): Promise<Tax> {
    const tax = await this.taxes.findById(input.tenantId, input.id);
    if (!tax || tax.companyId !== input.companyId) {
      throw new TaxNotFoundError();
    }
    tax.rename(input.name, input.rate);
    await this.taxes.save(tax);
    return tax;
  }
}
