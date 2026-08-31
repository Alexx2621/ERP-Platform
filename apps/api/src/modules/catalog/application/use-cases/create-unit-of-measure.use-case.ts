import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { UnitOfMeasure } from "../../domain/unit-of-measure.entity";
import { UNIT_OF_MEASURE_REPOSITORY, UnitOfMeasureRepository } from "../../domain/unit-of-measure.repository";
import { UnitOfMeasureCodeAlreadyInUseError } from "../errors";

export interface CreateUnitOfMeasureInput {
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  symbol: string;
}

@Injectable()
export class CreateUnitOfMeasureUseCase {
  constructor(
    @Inject(UNIT_OF_MEASURE_REPOSITORY) private readonly units: UnitOfMeasureRepository,
  ) {}

  async execute(input: CreateUnitOfMeasureInput): Promise<UnitOfMeasure> {
    const code = input.code.trim();
    const existing = await this.units.findByCode(input.tenantId, input.companyId, code);
    if (existing) {
      throw new UnitOfMeasureCodeAlreadyInUseError(code);
    }

    const now = new Date();
    const unit = UnitOfMeasure.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      code,
      name: input.name,
      symbol: input.symbol,
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.units.save(unit);
    return unit;
  }
}
