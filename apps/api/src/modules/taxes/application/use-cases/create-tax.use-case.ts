import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { Tax } from "../../domain/tax.entity";
import { TAX_REPOSITORY, TaxRepository } from "../../domain/tax.repository";
import { TaxCodeAlreadyInUseError } from "../errors";

export interface CreateTaxInput {
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  rate: string;
}

@Injectable()
export class CreateTaxUseCase {
  constructor(@Inject(TAX_REPOSITORY) private readonly taxes: TaxRepository) {}

  async execute(input: CreateTaxInput): Promise<Tax> {
    const code = input.code.trim();
    const existing = await this.taxes.findByCode(input.tenantId, input.companyId, code);
    if (existing) {
      throw new TaxCodeAlreadyInUseError(code);
    }

    const now = new Date();
    const tax = Tax.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      code,
      name: input.name,
      rate: input.rate,
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.taxes.save(tax);
    return tax;
  }
}
