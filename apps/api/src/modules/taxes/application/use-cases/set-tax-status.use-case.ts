import { Inject, Injectable } from "@nestjs/common";
import { MasterDataStatus, Tax } from "../../domain/tax.entity";
import { TAX_REPOSITORY, TaxRepository } from "../../domain/tax.repository";
import { TaxNotFoundError } from "../errors";

export interface SetTaxStatusInput {
  tenantId: string;
  companyId: string;
  id: string;
  status: MasterDataStatus;
}

@Injectable()
export class SetTaxStatusUseCase {
  constructor(@Inject(TAX_REPOSITORY) private readonly taxes: TaxRepository) {}

  async execute(input: SetTaxStatusInput): Promise<Tax> {
    const tax = await this.taxes.findById(input.tenantId, input.id);
    if (!tax || tax.companyId !== input.companyId) {
      throw new TaxNotFoundError();
    }
    tax.setStatus(input.status);
    await this.taxes.save(tax);
    return tax;
  }
}
