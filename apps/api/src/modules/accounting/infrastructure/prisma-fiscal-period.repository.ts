import { Injectable } from "@nestjs/common";
import type { FiscalPeriod as PrismaFiscalPeriod } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { FiscalPeriod } from "../domain/fiscal-period.entity";
import { FiscalPeriodRepository, ListFiscalPeriodsFilter } from "../domain/fiscal-period.repository";

@Injectable()
export class PrismaFiscalPeriodRepository implements FiscalPeriodRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<FiscalPeriod | null> {
    const record = await this.prisma.fiscalPeriod.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<FiscalPeriod | null> {
    const record = await this.prisma.fiscalPeriod.findUnique({
      where: { tenantId_companyId_code: { tenantId, companyId, code } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListFiscalPeriodsFilter): Promise<FiscalPeriod[]> {
    const records = await this.prisma.fiscalPeriod.findMany({
      where: { tenantId, companyId, status: filter.status },
      orderBy: { startDate: "asc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(period: FiscalPeriod): Promise<void> {
    const props = period.toProps();
    await this.prisma.fiscalPeriod.upsert({
      where: { id: props.id },
      create: props,
      update: { status: props.status, closedAt: props.closedAt, version: props.version },
    });
  }

  private toDomain(record: PrismaFiscalPeriod): FiscalPeriod {
    return FiscalPeriod.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      code: record.code,
      name: record.name,
      startDate: record.startDate,
      endDate: record.endDate,
      status: record.status,
      closedAt: record.closedAt,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
