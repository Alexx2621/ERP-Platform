import { Injectable } from "@nestjs/common";
import type { Storefront as PrismaStorefront } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Storefront } from "../domain/storefront.entity";
import { ListStorefrontsFilter, StorefrontRepository } from "../domain/storefront.repository";

@Injectable()
export class PrismaStorefrontRepository implements StorefrontRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Storefront | null> {
    const record = await this.prisma.storefront.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(code: string): Promise<Storefront | null> {
    const record = await this.prisma.storefront.findUnique({ where: { code } });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListStorefrontsFilter): Promise<Storefront[]> {
    const records = await this.prisma.storefront.findMany({
      where: { tenantId, companyId, status: filter.status },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(storefront: Storefront): Promise<void> {
    const props = storefront.toProps();
    await this.prisma.storefront.upsert({
      where: { id: props.id },
      create: props,
      update: {
        defaultWarehouseId: props.defaultWarehouseId,
        name: props.name,
        domain: props.domain,
        status: props.status,
        version: props.version,
      },
    });
  }

  private toDomain(record: PrismaStorefront): Storefront {
    return Storefront.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      defaultWarehouseId: record.defaultWarehouseId,
      code: record.code,
      name: record.name,
      domain: record.domain,
      currency: record.currency,
      status: record.status,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
