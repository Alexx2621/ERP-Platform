import { Injectable } from "@nestjs/common";
import { Prisma, type CommerceOrder as PrismaCommerceOrder } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { CommerceOrder } from "../domain/commerce-order.entity";
import { CommerceOrderRepository, ListCommerceOrdersFilter } from "../domain/commerce-order.repository";
import { CommerceOrderIdempotencyConflictError } from "../application/errors";

@Injectable()
export class PrismaCommerceOrderRepository implements CommerceOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<CommerceOrder | null> {
    const record = await this.prisma.commerceOrder.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async findByCartId(tenantId: string, companyId: string, cartId: string): Promise<CommerceOrder | null> {
    const record = await this.prisma.commerceOrder.findUnique({ where: { tenantId_cartId: { tenantId, cartId } } });
    return record && record.companyId === companyId ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListCommerceOrdersFilter): Promise<CommerceOrder[]> {
    const records = await this.prisma.commerceOrder.findMany({
      where: { tenantId, companyId, storefrontId: filter.storefrontId },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  /**
   * The unique constraint that can genuinely fire on insert here is
   * `(tenantId, cartId)`, when two concurrent checkout requests race on the
   * same cart — translated to `CommerceOrderIdempotencyConflictError` so
   * `CheckoutUseCase` can react to it without this infrastructure module
   * leaking a raw Prisma error across the module boundary
   * (docs/ARCHITECTURE.md §6), mirroring `PrismaPosSaleRepository.save`.
   */
  async save(order: CommerceOrder): Promise<void> {
    const props = order.toProps();
    try {
      await this.prisma.commerceOrder.upsert({ where: { id: props.id }, create: props, update: {} });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new CommerceOrderIdempotencyConflictError();
      }
      throw error;
    }
  }

  private toDomain(record: PrismaCommerceOrder): CommerceOrder {
    return CommerceOrder.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      storefrontId: record.storefrontId,
      cartId: record.cartId,
      salesOrderId: record.salesOrderId,
      paymentId: record.paymentId,
      customerId: record.customerId,
      guestEmail: record.guestEmail,
      total: record.total.toFixed(4),
      currency: record.currency,
      createdAt: record.createdAt,
    });
  }
}
