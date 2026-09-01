import { Injectable } from "@nestjs/common";
import type { PosShift as PrismaPosShift } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PosShift } from "../domain/pos-shift.entity";
import { ListPosShiftsFilter, PosShiftRepository } from "../domain/pos-shift.repository";

@Injectable()
export class PrismaPosShiftRepository implements PosShiftRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<PosShift | null> {
    const record = await this.prisma.posShift.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async findOpenByRegister(tenantId: string, registerId: string): Promise<PosShift | null> {
    const record = await this.prisma.posShift.findFirst({ where: { tenantId, registerId, status: "OPEN" } });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListPosShiftsFilter): Promise<PosShift[]> {
    const records = await this.prisma.posShift.findMany({
      where: { tenantId, companyId, registerId: filter.registerId, status: filter.status },
      orderBy: { openedAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(shift: PosShift): Promise<void> {
    const props = shift.toProps();
    await this.prisma.posShift.upsert({
      where: { id: props.id },
      create: props,
      update: {
        status: props.status,
        closedByUserId: props.closedByUserId,
        closedAt: props.closedAt,
        closingCashCounted: props.closingCashCounted,
        closingCashExpected: props.closingCashExpected,
        cashVariance: props.cashVariance,
      },
    });
  }

  private toDomain(record: PrismaPosShift): PosShift {
    return PosShift.fromProps({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      registerId: record.registerId,
      status: record.status,
      openedByUserId: record.openedByUserId,
      openedAt: record.openedAt,
      openingCash: record.openingCash.toFixed(4),
      closedByUserId: record.closedByUserId,
      closedAt: record.closedAt,
      closingCashCounted: record.closingCashCounted ? record.closingCashCounted.toFixed(4) : null,
      closingCashExpected: record.closingCashExpected ? record.closingCashExpected.toFixed(4) : null,
      cashVariance: record.cashVariance ? record.cashVariance.toFixed(4) : null,
      notes: record.notes,
    });
  }
}
