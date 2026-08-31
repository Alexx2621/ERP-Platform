import { Inject, Injectable } from "@nestjs/common";
import { UnitOfMeasure } from "../../domain/unit-of-measure.entity";
import { UNIT_OF_MEASURE_REPOSITORY, UnitOfMeasureRepository } from "../../domain/unit-of-measure.repository";

@Injectable()
export class ListUnitsOfMeasureUseCase {
  constructor(
    @Inject(UNIT_OF_MEASURE_REPOSITORY) private readonly units: UnitOfMeasureRepository,
  ) {}

  async execute(tenantId: string, companyId: string): Promise<UnitOfMeasure[]> {
    return this.units.listByCompany(tenantId, companyId);
  }
}
