import { Injectable } from "@nestjs/common";
import type { Prisma, AuditEntry as PrismaAuditEntry } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { AuditEntry } from "../domain/audit-entry.entity";
import { AuditEntryRepository, FindAuditEntriesQuery } from "../domain/audit-entry.repository";

@Injectable()
export class PrismaAuditEntryRepository implements AuditEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    const props = entry.toProps();
    await this.prisma.auditEntry.create({
      data: {
        id: props.id,
        userId: props.userId,
        tenantId: props.tenantId,
        companyId: props.companyId,
        action: props.action,
        resource: props.resource,
        resourceId: props.resourceId,
        previousValues: props.previousValues as Prisma.InputJsonValue | undefined,
        newValues: props.newValues as Prisma.InputJsonValue | undefined,
        ipAddress: props.ipAddress,
        userAgent: props.userAgent,
        correlationId: props.correlationId,
        createdAt: props.createdAt,
      },
    });
  }

  async findByTenant(query: FindAuditEntriesQuery): Promise<AuditEntry[]> {
    const records = await this.prisma.auditEntry.findMany({
      where: { tenantId: query.tenantId },
      orderBy: { createdAt: "desc" },
      take: query.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async findPlatformScoped(limit: number): Promise<AuditEntry[]> {
    const records = await this.prisma.auditEntry.findMany({
      where: { tenantId: null },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: PrismaAuditEntry): AuditEntry {
    return AuditEntry.create({
      id: record.id,
      userId: record.userId,
      tenantId: record.tenantId,
      companyId: record.companyId,
      action: record.action,
      resource: record.resource,
      resourceId: record.resourceId,
      previousValues: record.previousValues,
      newValues: record.newValues,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      correlationId: record.correlationId,
      createdAt: record.createdAt,
    });
  }
}
