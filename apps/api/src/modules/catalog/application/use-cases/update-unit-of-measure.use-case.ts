import { Inject, Injectable } from "@nestjs/common";
import { UnitOfMeasure } from "../../domain/unit-of-measure.entity";
import { UNIT_OF_MEASURE_REPOSITORY, UnitOfMeasureRepository } from "../../domain/unit-of-measure.repository";
import { UnitOfMeasureNotFoundError } from "../errors";

export interface UpdateUnitOfMeasureInput {
  tenantId: string;
  companyId: string;
  id: string;
  name: string;
  symbol: string;
}

/** "Not found" and "belongs to a different company" both surface as UnitOfMeasureNotFoundError — same IDOR-resistant pattern used across this codebase. */
@Injectable()
export class UpdateUnitOfMeasureUseCase {
  constructor(
    @Inject(UNIT_OF_MEASURE_REPOSITORY) private readonly units: UnitOfMeasureRepository,
  ) {}

  async execute(input: UpdateUnitOfMeasureInput): Promise<UnitOfMeasure> {
    const unit = await this.units.findById(input.tenantId, input.id);
    if (!unit || unit.companyId !== input.companyId) {
      throw new UnitOfMeasureNotFoundError();
    }
    unit.rename(input.name, input.symbol);
    await this.units.save(unit);
    return unit;
  }
}
