import { Injectable } from "@nestjs/common";
import type { Category as PrismaCategory } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Category } from "../domain/category.entity";
import { CategoryRepository } from "../domain/category.repository";

@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Category | null> {
    const record = await this.prisma.category.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<Category | null> {
    const record = await this.prisma.category.findUnique({
      where: { tenantId_companyId_code: { tenantId, companyId, code } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string): Promise<Category[]> {
    const records = await this.prisma.category.findMany({
      where: { tenantId, companyId },
      orderBy: { code: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(category: Category): Promise<void> {
    const props = category.toProps();
    await this.prisma.category.upsert({
      where: { tenantId_id: { tenantId: props.tenantId, id: props.id } },
      create: props,
      update: {
        name: props.name,
        parentId: props.parentId,
        status: props.status,
        version: props.version,
      },
    });
  }

  private toDomain(record: PrismaCategory): Category {
    return Category.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      parentId: record.parentId,
      code: record.code,
      name: record.name,
      status: record.status,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
