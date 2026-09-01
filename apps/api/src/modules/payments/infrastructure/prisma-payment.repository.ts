import { Injectable } from "@nestjs/common";
import { Prisma, type Payment as PrismaPayment } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Payment } from "../domain/payment.entity";
import { ListPaymentsFilter, PaymentRepository } from "../domain/payment.repository";
import { PaymentIdempotencyConflictError } from "../application/errors";

@Injectable()
export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Payment | null> {
    const record = await this.prisma.payment.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async findByIdempotencyKey(tenantId: string, companyId: string, idempotencyKey: string): Promise<Payment | null> {
    const record = await this.prisma.payment.findUnique({
      where: { tenantId_companyId_idempotencyKey: { tenantId, companyId, idempotencyKey } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListPaymentsFilter): Promise<Payment[]> {
    const records = await this.prisma.payment.findMany({
      where: { tenantId, companyId, salesOrderId: filter.salesOrderId },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  /**
   * A `Payment.id` collision on insert is not a real-world concern (a fresh
   * UUIDv7 every time) — the unique constraint that can genuinely fire here
   * is `(tenantId, companyId, idempotencyKey)`, when two concurrent capture
   * requests race with the same key. That P2002 is translated to
   * `PaymentIdempotencyConflictError` so `CapturePaymentUseCase` can react
   * to it without this infrastructure module leaking a raw Prisma error
   * type across the module boundary (docs/ARCHITECTURE.md §6).
   */
  async save(payment: Payment): Promise<void> {
    const props = payment.toProps();
    try {
      await this.prisma.payment.upsert({
        where: { id: props.id },
        create: props,
        update: {
          status: props.status,
          refundedAt: props.refundedAt,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new PaymentIdempotencyConflictError();
      }
      throw error;
    }
  }

  private toDomain(record: PrismaPayment): Payment {
    return Payment.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      salesOrderId: record.salesOrderId,
      method: record.method,
      status: record.status,
      amount: record.amount.toFixed(4),
      currency: record.currency,
      idempotencyKey: record.idempotencyKey,
      gatewayReference: record.gatewayReference,
      failureReason: record.failureReason,
      createdAt: record.createdAt,
      capturedAt: record.capturedAt,
      refundedAt: record.refundedAt,
    });
  }
}
