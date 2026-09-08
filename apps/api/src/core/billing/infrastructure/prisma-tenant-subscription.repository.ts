import { Injectable } from "@nestjs/common";
import { Prisma, type TenantSubscription as PrismaTenantSubscription } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { TenantSubscription } from "../domain/tenant-subscription.entity";
import { TenantSubscriptionRepository } from "../domain/tenant-subscription.repository";
import { TenantSubscriptionConflictError } from "../application/errors";

@Injectable()
export class PrismaTenantSubscriptionRepository implements TenantSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantId(tenantId: string): Promise<TenantSubscription | null> {
    const record = await this.prisma.tenantSubscription.findUnique({ where: { tenantId } });
    return record ? this.toDomain(record) : null;
  }

  async findByRecurrenteCustomerId(recurrenteCustomerId: string): Promise<TenantSubscription | null> {
    const record = await this.prisma.tenantSubscription.findFirst({ where: { recurrenteCustomerId } });
    return record ? this.toDomain(record) : null;
  }

  async findByRecurrenteSubscriptionId(recurrenteSubscriptionId: string): Promise<TenantSubscription | null> {
    const record = await this.prisma.tenantSubscription.findFirst({ where: { recurrenteSubscriptionId } });
    return record ? this.toDomain(record) : null;
  }

  /**
   * Upsert by `tenantId` — one row per tenant. A P2002 here means two
   * concurrent requests raced to create the tenant's first row (e.g. two
   * simultaneous checkout attempts); translated to
   * `TenantSubscriptionConflictError` rather than leaking a raw Prisma
   * error across the module boundary (docs/ARCHITECTURE.md §6), the same
   * pattern `PrismaPaymentRepository` already established.
   */
  async save(subscription: TenantSubscription): Promise<void> {
    const props = subscription.toProps();
    try {
      await this.prisma.tenantSubscription.upsert({
        where: { tenantId: props.tenantId },
        create: {
          id: props.id,
          tenantId: props.tenantId,
          planId: props.planId,
          status: props.status,
          seatCount: props.seatCount,
          recurrenteCustomerId: props.recurrenteCustomerId,
          recurrenteSubscriptionId: props.recurrenteSubscriptionId,
          currentPeriodStart: props.currentPeriodStart,
          currentPeriodEnd: props.currentPeriodEnd,
          cancelledAt: props.cancelledAt,
          createdAt: props.createdAt,
        },
        update: {
          planId: props.planId,
          status: props.status,
          seatCount: props.seatCount,
          recurrenteCustomerId: props.recurrenteCustomerId,
          recurrenteSubscriptionId: props.recurrenteSubscriptionId,
          currentPeriodStart: props.currentPeriodStart,
          currentPeriodEnd: props.currentPeriodEnd,
          cancelledAt: props.cancelledAt,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new TenantSubscriptionConflictError();
      }
      throw error;
    }
  }

  private toDomain(record: PrismaTenantSubscription): TenantSubscription {
    return TenantSubscription.create({
      id: record.id,
      tenantId: record.tenantId,
      planId: record.planId,
      status: record.status,
      seatCount: record.seatCount,
      recurrenteCustomerId: record.recurrenteCustomerId,
      recurrenteSubscriptionId: record.recurrenteSubscriptionId,
      currentPeriodStart: record.currentPeriodStart,
      currentPeriodEnd: record.currentPeriodEnd,
      cancelledAt: record.cancelledAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
