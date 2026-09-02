import { Injectable } from "@nestjs/common";
import type { Cart as PrismaCart } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Cart } from "../domain/cart.entity";
import { CartRepository } from "../domain/cart.repository";

@Injectable()
export class PrismaCartRepository implements CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Cart | null> {
    const record = await this.prisma.cart.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async save(cart: Cart): Promise<void> {
    const props = cart.toProps();
    await this.prisma.cart.upsert({
      where: { id: props.id },
      create: props,
      update: { status: props.status },
    });
  }

  private toDomain(record: PrismaCart): Cart {
    return Cart.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      storefrontId: record.storefrontId,
      currency: record.currency,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
