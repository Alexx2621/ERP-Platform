import { Injectable } from "@nestjs/common";
import type { JournalEntryLine as PrismaJournalEntryLine } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { JournalEntryLine } from "../domain/journal-entry-line.entity";
import { JournalEntryLineRepository } from "../domain/journal-entry-line.repository";

@Injectable()
export class PrismaJournalEntryLineRepository implements JournalEntryLineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByJournalEntry(tenantId: string, journalEntryId: string): Promise<JournalEntryLine[]> {
    const records = await this.prisma.journalEntryLine.findMany({
      where: { tenantId, journalEntryId },
      orderBy: { lineNumber: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async listByAccount(tenantId: string, accountId: string): Promise<JournalEntryLine[]> {
    const records = await this.prisma.journalEntryLine.findMany({ where: { tenantId, accountId } });
    return records.map((record) => this.toDomain(record));
  }

  async listByJournalEntryIds(tenantId: string, journalEntryIds: string[]): Promise<JournalEntryLine[]> {
    if (journalEntryIds.length === 0) return [];
    const records = await this.prisma.journalEntryLine.findMany({
      where: { tenantId, journalEntryId: { in: journalEntryIds } },
    });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: PrismaJournalEntryLine): JournalEntryLine {
    return JournalEntryLine.create({
      id: record.id,
      tenantId: record.tenantId,
      journalEntryId: record.journalEntryId,
      accountId: record.accountId,
      lineNumber: record.lineNumber,
      // .toFixed(4), not .toString() — Decimal.js's .toString() strips
      // trailing zeros, disagreeing with what numeric(14,4) actually
      // stores (the Catalog/Taxes precedent, applied proactively here).
      debit: record.debit.toFixed(4),
      credit: record.credit.toFixed(4),
      description: record.description,
      createdAt: record.createdAt,
    });
  }
}
