import { Inject, Injectable } from "@nestjs/common";
import { Tax } from "../../domain/tax.entity";
import { TAX_REPOSITORY, TaxRepository } from "../../domain/tax.repository";

/** Cross-module read boundary (docs/ARCHITECTURE.md §6) — resolves a per-line tax rate snapshot for Sales. */
@Injectable()
export class GetTaxUseCase {
  constructor(@Inject(TAX_REPOSITORY) private readonly taxes: TaxRepository) {}

  async execute(tenantId: string, id: string): Promise<Tax | null> {
    return this.taxes.findById(tenantId, id);
  }
}
