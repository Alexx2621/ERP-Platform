import { Injectable } from "@nestjs/common";
import type { CartLine as PrismaCartLine } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { CartLine } from "../domain/cart-line.entity";
import { CartLineRepository } from "../domain/cart-line.repository";

@Injectable()
export class PrismaCartLineRepository implements CartLineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<CartLine | null> {
    const record = await this.prisma.cartLine.findUnique({ where: { id } });
    return record && record.tenantId === tenantId ? this.toDomain(record) : null;
  }

  async findByCartAndTarget(tenantId: string, cartId: string, productId: string, productVariantId: string | null): Promise<CartLine | null> {
    const record = await this.prisma.cartLine.findFirst({ where: { tenantId, cartId, productId, productVariantId } });
    return record ? this.toDomain(record) : null;
  }

  async listByCart(tenantId: string, cartId: string): Promise<CartLine[]> {
    const records = await this.prisma.cartLine.findMany({ where: { tenantId, cartId }, orderBy: { createdAt: "asc" } });
    return records.map((record) => this.toDomain(record));
  }

  async save(line: CartLine): Promise<void> {
    const props = line.toProps();
    await this.prisma.cartLine.upsert({
      where: { id: props.id },
      create: props,
      update: { quantity: props.quantity, updatedAt: props.updatedAt },
    });
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.prisma.cartLine.deleteMany({ where: { id, tenantId } });
  }

  private toDomain(record: PrismaCartLine): CartLine {
    return CartLine.create({
      id: record.id,
      tenantId: record.tenantId,
      cartId: record.cartId,
      productId: record.productId,
      productVariantId: record.productVariantId,
      quantity: record.quantity.toFixed(4),
      unitPrice: record.unitPrice.toFixed(4),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
