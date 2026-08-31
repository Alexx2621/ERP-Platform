import { Injectable } from "@nestjs/common";
import { Prisma, type ProductVariant as PrismaProductVariant } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { ProductVariant } from "../domain/product-variant.entity";
import { ProductVariantRepository } from "../domain/product-variant.repository";

@Injectable()
export class PrismaProductVariantRepository implements ProductVariantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<ProductVariant | null> {
    const record = await this.prisma.productVariant.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async findBySku(tenantId: string, sku: string): Promise<ProductVariant | null> {
    const record = await this.prisma.productVariant.findUnique({ where: { tenantId_sku: { tenantId, sku } } });
    return record ? this.toDomain(record) : null;
  }

  async listByProduct(tenantId: string, productId: string): Promise<ProductVariant[]> {
    const records = await this.prisma.productVariant.findMany({
      where: { tenantId, productId },
      orderBy: { sku: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(variant: ProductVariant): Promise<void> {
    const props = variant.toProps();
    await this.prisma.productVariant.upsert({
      where: { tenantId_sku: { tenantId: props.tenantId, sku: props.sku } },
      create: {
        id: props.id,
        tenantId: props.tenantId,
        productId: props.productId,
        sku: props.sku,
        barcode: props.barcode,
        attributes: props.attributes as Prisma.InputJsonValue,
        price: props.price,
        cost: props.cost,
        status: props.status,
        version: props.version,
        createdAt: props.createdAt,
      },
      update: {
        barcode: props.barcode,
        price: props.price,
        cost: props.cost,
        status: props.status,
        version: props.version,
      },
    });
  }

  private toDomain(record: PrismaProductVariant): ProductVariant {
    return ProductVariant.create({
      id: record.id,
      tenantId: record.tenantId,
      productId: record.productId,
      sku: record.sku,
      barcode: record.barcode,
      attributes: record.attributes as Record<string, string>,
      // See PrismaProductRepository.toDomain() — .toFixed(4) (Decimal.js
      // arithmetic, never a JS `number`) matches numeric(14,4)'s real scale;
      // plain .toString() strips trailing zeros inconsistently.
      price: record.price.toFixed(4),
      cost: record.cost ? record.cost.toFixed(4) : null,
      status: record.status,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
