import { Injectable } from "@nestjs/common";
import type { UnitOfMeasure as PrismaUnitOfMeasure } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { UnitOfMeasure } from "../domain/unit-of-measure.entity";
import { UnitOfMeasureRepository } from "../domain/unit-of-measure.repository";

@Injectable()
export class PrismaUnitOfMeasureRepository implements UnitOfMeasureRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<UnitOfMeasure | null> {
    const record = await this.prisma.unitOfMeasure.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<UnitOfMeasure | null> {
    const record = await this.prisma.unitOfMeasure.findUnique({
      where: { tenantId_companyId_code: { tenantId, companyId, code } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string): Promise<UnitOfMeasure[]> {
    const records = await this.prisma.unitOfMeasure.findMany({
      where: { tenantId, companyId },
      orderBy: { code: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(unitOfMeasure: UnitOfMeasure): Promise<void> {
    const props = unitOfMeasure.toProps();
    await this.prisma.unitOfMeasure.upsert({
      where: { tenantId_id: { tenantId: props.tenantId, id: props.id } },
      create: props,
      update: { name: props.name, symbol: props.symbol, status: props.status, version: props.version },
    });
  }

  private toDomain(record: PrismaUnitOfMeasure): UnitOfMeasure {
    return UnitOfMeasure.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      code: record.code,
      name: record.name,
      symbol: record.symbol,
      status: record.status,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
