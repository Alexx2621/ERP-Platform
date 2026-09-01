import { Injectable } from "@nestjs/common";
import { Prisma, type PosReturn as PrismaPosReturn } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PosReturn } from "../domain/pos-return.entity";
import { ListPosReturnsFilter, PosReturnRepository } from "../domain/pos-return.repository";
import { PosReturnIdempotencyConflictError } from "../application/errors";

@Injectable()
export class PrismaPosReturnRepository implements PosReturnRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdempotencyKey(tenantId: string, companyId: string, idempotencyKey: string): Promise<PosReturn | null> {
    const record = await this.prisma.posReturn.findUnique({
      where: { tenantId_companyId_idempotencyKey: { tenantId, companyId, idempotencyKey } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByPosSale(tenantId: string, posSaleId: string): Promise<PosReturn[]> {
    const records = await this.prisma.posReturn.findMany({ where: { tenantId, posSaleId }, orderBy: { createdAt: "asc" } });
    return records.map((record) => this.toDomain(record));
  }

  async listByShift(tenantId: string, shiftId: string): Promise<PosReturn[]> {
    const records = await this.prisma.posReturn.findMany({ where: { tenantId, shiftId }, orderBy: { createdAt: "asc" } });
    return records.map((record) => this.toDomain(record));
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListPosReturnsFilter): Promise<PosReturn[]> {
    const records = await this.prisma.posReturn.findMany({
      where: { tenantId, companyId, shiftId: filter.shiftId },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  /** Same P2002-translation reasoning as `PrismaPosSaleRepository.save`, for `(tenantId, companyId, idempotencyKey)`. */
  async save(posReturn: PosReturn): Promise<void> {
    const props = posReturn.toProps();
    try {
      await this.prisma.posReturn.upsert({ where: { id: props.id }, create: props, update: {} });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new PosReturnIdempotencyConflictError();
      }
      throw error;
    }
  }

  private toDomain(record: PrismaPosReturn): PosReturn {
    return PosReturn.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      shiftId: record.shiftId,
      posSaleId: record.posSaleId,
      salesReturnId: record.salesReturnId,
      idempotencyKey: record.idempotencyKey,
      refunded: record.refunded,
      refundAmount: record.refundAmount ? record.refundAmount.toFixed(4) : null,
      refundMethod: record.refundMethod,
      reason: record.reason,
      createdAt: record.createdAt,
    });
  }
}
