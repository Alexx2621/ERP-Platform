import { Injectable } from "@nestjs/common";
import type { Warehouse as PrismaWarehouse } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Warehouse } from "../domain/warehouse.entity";
import { WarehouseRepository } from "../domain/warehouse.repository";

@Injectable()
export class PrismaWarehouseRepository implements WarehouseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Warehouse | null> {
    const record = await this.prisma.warehouse.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<Warehouse | null> {
    const record = await this.prisma.warehouse.findUnique({
      where: { tenantId_companyId_code: { tenantId, companyId, code } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string): Promise<Warehouse[]> {
    const records = await this.prisma.warehouse.findMany({
      where: { tenantId, companyId },
      orderBy: { code: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(warehouse: Warehouse): Promise<void> {
    const props = warehouse.toProps();
    await this.prisma.warehouse.upsert({
      where: { id: props.id },
      create: props,
      update: {
        name: props.name,
        addressLine: props.addressLine,
        city: props.city,
        country: props.country,
        status: props.status,
        version: props.version,
      },
    });
  }

  private toDomain(record: PrismaWarehouse): Warehouse {
    return Warehouse.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      code: record.code,
      name: record.name,
      addressLine: record.addressLine,
      city: record.city,
      country: record.country,
      status: record.status,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
