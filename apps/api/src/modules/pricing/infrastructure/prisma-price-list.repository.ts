import { Injectable } from "@nestjs/common";
import type { PriceList as PrismaPriceList } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PriceList } from "../domain/price-list.entity";
import { PriceListRepository } from "../domain/price-list.repository";

@Injectable()
export class PrismaPriceListRepository implements PriceListRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<PriceList | null> {
    const record = await this.prisma.priceList.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<PriceList | null> {
    const record = await this.prisma.priceList.findUnique({
      where: { tenantId_companyId_code: { tenantId, companyId, code } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string): Promise<PriceList[]> {
    const records = await this.prisma.priceList.findMany({
      where: { tenantId, companyId },
      orderBy: { code: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(priceList: PriceList): Promise<void> {
    const props = priceList.toProps();
    await this.prisma.priceList.upsert({
      where: { tenantId_id: { tenantId: props.tenantId, id: props.id } },
      create: props,
      update: {
        name: props.name,
        currency: props.currency,
        validFrom: props.validFrom,
        validUntil: props.validUntil,
        status: props.status,
        version: props.version,
      },
    });
  }

  private toDomain(record: PrismaPriceList): PriceList {
    return PriceList.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      code: record.code,
      name: record.name,
      currency: record.currency,
      validFrom: record.validFrom,
      validUntil: record.validUntil,
      status: record.status,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
