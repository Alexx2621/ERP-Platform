import { Inject, Injectable } from "@nestjs/common";
import { MasterDataStatus, UnitOfMeasure } from "../../domain/unit-of-measure.entity";
import { UNIT_OF_MEASURE_REPOSITORY, UnitOfMeasureRepository } from "../../domain/unit-of-measure.repository";
import { UnitOfMeasureNotFoundError } from "../errors";

export interface SetUnitOfMeasureStatusInput {
  tenantId: string;
  companyId: string;
  id: string;
  status: MasterDataStatus;
}

@Injectable()
export class SetUnitOfMeasureStatusUseCase {
  constructor(
    @Inject(UNIT_OF_MEASURE_REPOSITORY) private readonly units: UnitOfMeasureRepository,
  ) {}

  async execute(input: SetUnitOfMeasureStatusInput): Promise<UnitOfMeasure> {
    const unit = await this.units.findById(input.tenantId, input.id);
    if (!unit || unit.companyId !== input.companyId) {
      throw new UnitOfMeasureNotFoundError();
    }
    unit.setStatus(input.status);
    await this.units.save(unit);
    return unit;
  }
}
