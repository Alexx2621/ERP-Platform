import { Injectable } from "@nestjs/common";
import type { PriceListItem as PrismaPriceListItem } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PriceListItem } from "../domain/price-list-item.entity";
import { PriceListItemRepository } from "../domain/price-list-item.repository";

@Injectable()
export class PrismaPriceListItemRepository implements PriceListItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<PriceListItem | null> {
    const record = await this.prisma.priceListItem.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async findByProduct(tenantId: string, priceListId: string, productId: string): Promise<PriceListItem | null> {
    const record = await this.prisma.priceListItem.findUnique({
      where: { tenantId_priceListId_productId: { tenantId, priceListId, productId } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByPriceList(tenantId: string, priceListId: string): Promise<PriceListItem[]> {
    const records = await this.prisma.priceListItem.findMany({
      where: { tenantId, priceListId },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(item: PriceListItem): Promise<void> {
    const props = item.toProps();
    await this.prisma.priceListItem.upsert({
      where: { id: props.id },
      create: props,
      update: { price: props.price },
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.prisma.priceListItem.deleteMany({ where: { tenantId, id } });
  }

  private toDomain(record: PrismaPriceListItem): PriceListItem {
    return PriceListItem.create({
      id: record.id,
      tenantId: record.tenantId,
      priceListId: record.priceListId,
      productId: record.productId,
      // .toFixed(4), not .toString() — same real bug already fixed once
      // in Catalog this session (Decimal.js strips trailing zeros).
      price: record.price.toFixed(4),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
