import { Injectable } from "@nestjs/common";
import type { StorefrontProduct as PrismaStorefrontProduct } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { StorefrontProduct } from "../domain/storefront-product.entity";
import { ListStorefrontProductsFilter, StorefrontProductRepository } from "../domain/storefront-product.repository";

@Injectable()
export class PrismaStorefrontProductRepository implements StorefrontProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByStorefrontAndProduct(tenantId: string, storefrontId: string, productId: string): Promise<StorefrontProduct | null> {
    const record = await this.prisma.storefrontProduct.findUnique({
      where: { tenantId_storefrontId_productId: { tenantId, storefrontId, productId } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByStorefront(tenantId: string, storefrontId: string, filter: ListStorefrontProductsFilter): Promise<StorefrontProduct[]> {
    const records = await this.prisma.storefrontProduct.findMany({
      where: { tenantId, storefrontId, status: filter.status },
      orderBy: { publishedAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(publication: StorefrontProduct): Promise<void> {
    const props = publication.toProps();
    await this.prisma.storefrontProduct.upsert({
      where: { id: props.id },
      create: props,
      update: { status: props.status, publishedAt: props.publishedAt },
    });
  }

  private toDomain(record: PrismaStorefrontProduct): StorefrontProduct {
    return StorefrontProduct.create({
      id: record.id,
      tenantId: record.tenantId,
      storefrontId: record.storefrontId,
      productId: record.productId,
      status: record.status,
      publishedAt: record.publishedAt,
    });
  }
}
