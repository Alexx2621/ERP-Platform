import { Injectable } from "@nestjs/common";
import type { Brand as PrismaBrand } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Brand } from "../domain/brand.entity";
import { BrandRepository } from "../domain/brand.repository";

@Injectable()
export class PrismaBrandRepository implements BrandRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Brand | null> {
    const record = await this.prisma.brand.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<Brand | null> {
    const record = await this.prisma.brand.findUnique({
      where: { tenantId_companyId_code: { tenantId, companyId, code } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string): Promise<Brand[]> {
    const records = await this.prisma.brand.findMany({
      where: { tenantId, companyId },
      orderBy: { code: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(brand: Brand): Promise<void> {
    const props = brand.toProps();
    await this.prisma.brand.upsert({
      where: { tenantId_id: { tenantId: props.tenantId, id: props.id } },
      create: props,
      update: { name: props.name, status: props.status, version: props.version },
    });
  }

  private toDomain(record: PrismaBrand): Brand {
    return Brand.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      code: record.code,
      name: record.name,
      status: record.status,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
