import { Injectable } from "@nestjs/common";
import type { BillOfMaterial as PrismaBillOfMaterial } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { BillOfMaterial } from "../domain/bill-of-material.entity";
import { BillOfMaterialRepository, ListBillOfMaterialsFilter } from "../domain/bill-of-material.repository";

@Injectable()
export class PrismaBillOfMaterialRepository implements BillOfMaterialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<BillOfMaterial | null> {
    const record = await this.prisma.billOfMaterial.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<BillOfMaterial | null> {
    const record = await this.prisma.billOfMaterial.findUnique({
      where: { tenantId_companyId_code: { tenantId, companyId, code } },
    });
    return record ? this.toDomain(record) : null;
  }

  async countByProduct(tenantId: string, companyId: string, productId: string): Promise<number> {
    return this.prisma.billOfMaterial.count({ where: { tenantId, companyId, productId } });
  }

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListBillOfMaterialsFilter,
  ): Promise<BillOfMaterial[]> {
    const records = await this.prisma.billOfMaterial.findMany({
      where: {
        tenantId,
        companyId,
        productId: filter.productId,
        status: filter.status as never,
      },
      orderBy: [{ productId: "asc" }, { version: "desc" }],
      take: filter.limit ?? 50,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(billOfMaterial: BillOfMaterial): Promise<void> {
    const props = billOfMaterial.toProps();
    await this.prisma.billOfMaterial.upsert({
      where: { id: props.id },
      create: props,
      update: { name: props.name, status: props.status, updatedAt: props.updatedAt },
    });
  }

  private toDomain(record: PrismaBillOfMaterial): BillOfMaterial {
    return BillOfMaterial.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      productId: record.productId,
      code: record.code,
      name: record.name,
      version: record.version,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
