import { Injectable } from "@nestjs/common";
import type { Product as PrismaProduct } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Product } from "../domain/product.entity";
import { ProductRepository } from "../domain/product.repository";

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Product | null> {
    const record = await this.prisma.product.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<Product | null> {
    const record = await this.prisma.product.findUnique({
      where: { tenantId_companyId_code: { tenantId, companyId, code } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByBarcode(tenantId: string, companyId: string, barcode: string): Promise<Product | null> {
    const record = await this.prisma.product.findUnique({
      where: { tenantId_companyId_barcode: { tenantId, companyId, barcode } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string): Promise<Product[]> {
    const records = await this.prisma.product.findMany({
      where: { tenantId, companyId },
      orderBy: { code: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(product: Product): Promise<void> {
    const props = product.toProps();
    await this.prisma.product.upsert({
      where: { tenantId_id: { tenantId: props.tenantId, id: props.id } },
      create: {
        id: props.id,
        tenantId: props.tenantId,
        companyId: props.companyId,
        categoryId: props.categoryId,
        brandId: props.brandId,
        unitOfMeasureId: props.unitOfMeasureId,
        code: props.code,
        name: props.name,
        description: props.description,
        type: props.type,
        trackInventory: props.trackInventory,
        sellable: props.sellable,
        purchasable: props.purchasable,
        hasVariants: props.hasVariants,
        publishOnline: props.publishOnline,
        barcode: props.barcode,
        basePrice: props.basePrice,
        baseCost: props.baseCost,
        status: props.status,
        version: props.version,
        createdAt: props.createdAt,
      },
      update: {
        categoryId: props.categoryId,
        brandId: props.brandId,
        name: props.name,
        description: props.description,
        trackInventory: props.trackInventory,
        sellable: props.sellable,
        purchasable: props.purchasable,
        publishOnline: props.publishOnline,
        barcode: props.barcode,
        basePrice: props.basePrice,
        baseCost: props.baseCost,
        status: props.status,
        version: props.version,
      },
    });
  }

  private toDomain(record: PrismaProduct): Product {
    return Product.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      categoryId: record.categoryId,
      brandId: record.brandId,
      unitOfMeasureId: record.unitOfMeasureId,
      code: record.code,
      name: record.name,
      description: record.description,
      type: record.type,
      trackInventory: record.trackInventory,
      sellable: record.sellable,
      purchasable: record.purchasable,
      hasVariants: record.hasVariants,
      publishOnline: record.publishOnline,
      barcode: record.barcode,
      // .toFixed(4) uses Decimal.js's own arbitrary-precision arithmetic
      // (never a JS `number`) to match the column's declared numeric(14,4)
      // scale — plain .toString() silently strips trailing zeros (24.9900
      // becomes "24.99"), which is inconsistent with what Postgres actually
      // stores and with the value a fresh create() response echoes back.
      basePrice: record.basePrice ? record.basePrice.toFixed(4) : null,
      baseCost: record.baseCost ? record.baseCost.toFixed(4) : null,
      status: record.status,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
