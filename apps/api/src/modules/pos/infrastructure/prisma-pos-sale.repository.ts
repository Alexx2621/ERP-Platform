import { Injectable } from "@nestjs/common";
import { Prisma, type PosSale as PrismaPosSale } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PosSale } from "../domain/pos-sale.entity";
import { ListPosSalesFilter, PosSaleRepository } from "../domain/pos-sale.repository";
import { PosSaleIdempotencyConflictError } from "../application/errors";

@Injectable()
export class PrismaPosSaleRepository implements PosSaleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<PosSale | null> {
    const record = await this.prisma.posSale.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async findByIdempotencyKey(tenantId: string, companyId: string, idempotencyKey: string): Promise<PosSale | null> {
    const record = await this.prisma.posSale.findUnique({
      where: { tenantId_companyId_idempotencyKey: { tenantId, companyId, idempotencyKey } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByShift(tenantId: string, shiftId: string): Promise<PosSale[]> {
    const records = await this.prisma.posSale.findMany({ where: { tenantId, shiftId }, orderBy: { createdAt: "asc" } });
    return records.map((record) => this.toDomain(record));
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListPosSalesFilter): Promise<PosSale[]> {
    const records = await this.prisma.posSale.findMany({
      where: { tenantId, companyId, shiftId: filter.shiftId },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  /**
   * A `PosSale.id` collision on insert is not a real-world concern (a fresh
   * UUIDv7 every time) — the unique constraint that can genuinely fire here
   * is `(tenantId, companyId, idempotencyKey)`, when two concurrent ring-up
   * requests race with the same key. That P2002 is translated to
   * `PosSaleIdempotencyConflictError` so `RingUpSaleUseCase` can react to it
   * without this infrastructure module leaking a raw Prisma error type
   * across the module boundary (docs/ARCHITECTURE.md §6) — mirrors
   * `PrismaPaymentRepository.save` exactly.
   */
  async save(sale: PosSale): Promise<void> {
    const props = sale.toProps();
    try {
      await this.prisma.posSale.upsert({ where: { id: props.id }, create: props, update: {} });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new PosSaleIdempotencyConflictError();
      }
      throw error;
    }
  }

  private toDomain(record: PrismaPosSale): PosSale {
    return PosSale.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      shiftId: record.shiftId,
      salesOrderId: record.salesOrderId,
      paymentId: record.paymentId,
      idempotencyKey: record.idempotencyKey,
      paymentMethod: record.paymentMethod,
      amount: record.amount.toFixed(4),
      amountTendered: record.amountTendered ? record.amountTendered.toFixed(4) : null,
      changeDue: record.changeDue ? record.changeDue.toFixed(4) : null,
      createdAt: record.createdAt,
    });
  }
}
