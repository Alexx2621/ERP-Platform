import { Injectable } from "@nestjs/common";
import type { PosCashMovement as PrismaPosCashMovement } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PosCashMovement } from "../domain/pos-cash-movement.entity";
import { PosCashMovementRepository } from "../domain/pos-cash-movement.repository";

@Injectable()
export class PrismaPosCashMovementRepository implements PosCashMovementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByShift(tenantId: string, shiftId: string): Promise<PosCashMovement[]> {
    const records = await this.prisma.posCashMovement.findMany({
      where: { tenantId, shiftId },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(movement: PosCashMovement): Promise<void> {
    const props = movement.toProps();
    await this.prisma.posCashMovement.upsert({ where: { id: props.id }, create: props, update: {} });
  }

  private toDomain(record: PrismaPosCashMovement): PosCashMovement {
    return PosCashMovement.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      shiftId: record.shiftId,
      type: record.type,
      amount: record.amount.toFixed(4),
      reason: record.reason,
      recordedByUserId: record.recordedByUserId,
      createdAt: record.createdAt,
    });
  }
}
