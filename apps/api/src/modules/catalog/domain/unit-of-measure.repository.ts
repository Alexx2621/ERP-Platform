import { UnitOfMeasure } from "./unit-of-measure.entity";

export interface UnitOfMeasureRepository {
  findById(tenantId: string, id: string): Promise<UnitOfMeasure | null>;
  findByCode(tenantId: string, companyId: string, code: string): Promise<UnitOfMeasure | null>;
  listByCompany(tenantId: string, companyId: string): Promise<UnitOfMeasure[]>;
  save(unitOfMeasure: UnitOfMeasure): Promise<void>;
}

export const UNIT_OF_MEASURE_REPOSITORY = Symbol("UNIT_OF_MEASURE_REPOSITORY");
