import { Injectable } from "@nestjs/common";
import type { Tax as PrismaTax } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Tax } from "../domain/tax.entity";
import { TaxRepository } from "../domain/tax.repository";

@Injectable()
export class PrismaTaxRepository implements TaxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Tax | null> {
    const record = await this.prisma.tax.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<Tax | null> {
    const record = await this.prisma.tax.findUnique({
      where: { tenantId_companyId_code: { tenantId, companyId, code } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string): Promise<Tax[]> {
    const records = await this.prisma.tax.findMany({
      where: { tenantId, companyId },
      orderBy: { code: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(tax: Tax): Promise<void> {
    const props = tax.toProps();
    await this.prisma.tax.upsert({
      where: { id: props.id },
      create: props,
      update: { name: props.name, rate: props.rate, status: props.status, version: props.version },
    });
  }

  private toDomain(record: PrismaTax): Tax {
    return Tax.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      code: record.code,
      name: record.name,
      // .toFixed(4), not .toString() — Decimal.js's .toString() strips
      // trailing zeros (the real bug found and fixed in Catalog this
      // session), disagreeing with what numeric(7,4) actually stores.
      rate: record.rate.toFixed(4),
      status: record.status,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
