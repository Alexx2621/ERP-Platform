import { Injectable } from "@nestjs/common";
import { Prisma, type JournalEntry as PrismaJournalEntry } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { JournalEntry } from "../domain/journal-entry.entity";
import { JournalEntryLine } from "../domain/journal-entry-line.entity";
import { JournalEntryRepository, ListJournalEntriesFilter } from "../domain/journal-entry.repository";
import { JournalEntryIdempotencyConflictError } from "../application/errors";

@Injectable()
export class PrismaJournalEntryRepository implements JournalEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<JournalEntry | null> {
    const record = await this.prisma.journalEntry.findFirst({ where: { tenantId, id } });
    return record ? this.toDomain(record) : null;
  }

  async findBySource(tenantId: string, companyId: string, sourceType: string, sourceId: string): Promise<JournalEntry | null> {
    const record = await this.prisma.journalEntry.findUnique({
      where: { tenantId_companyId_sourceType_sourceId: { tenantId, companyId, sourceType, sourceId } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListJournalEntriesFilter): Promise<JournalEntry[]> {
    const records = await this.prisma.journalEntry.findMany({
      where: { tenantId, companyId, fiscalPeriodId: filter.fiscalPeriodId },
      orderBy: { entryDate: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async listByCompanyUpTo(tenantId: string, companyId: string, asOfDate: Date): Promise<JournalEntry[]> {
    const records = await this.prisma.journalEntry.findMany({
      where: { tenantId, companyId, entryDate: { lte: asOfDate } },
      orderBy: { entryDate: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  /**
   * The only unique constraint that can genuinely fire on insert here is
   * `(tenantId, companyId, sourceType, sourceId)` — and only when both are
   * non-null, since Postgres treats every NULL as distinct for uniqueness.
   * Translated unconditionally, mirroring `PrismaCommerceOrderRepository.save`
   * exactly, so this infrastructure module never leaks a raw Prisma error
   * across the module boundary (docs/ARCHITECTURE.md §6) — the caller
   * (`CreateJournalEntryUseCase`) only reacts to it when it actually
   * supplied a source key.
   */
  async saveWithLines(entry: JournalEntry, lines: JournalEntryLine[]): Promise<void> {
    const entryProps = entry.toProps();
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.journalEntry.create({ data: entryProps });
        await tx.journalEntryLine.createMany({ data: lines.map((line) => line.toProps()) });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new JournalEntryIdempotencyConflictError();
      }
      throw error;
    }
  }

  /** Update-only — used solely by `ReverseJournalEntryUseCase` to set `reversedByEntryId`/`reversedAt`. Never touches lines. */
  async save(entry: JournalEntry): Promise<void> {
    const props = entry.toProps();
    await this.prisma.journalEntry.update({
      where: { id: props.id },
      data: { reversedByEntryId: props.reversedByEntryId, reversedAt: props.reversedAt },
    });
  }

  private toDomain(record: PrismaJournalEntry): JournalEntry {
    return JournalEntry.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      fiscalPeriodId: record.fiscalPeriodId,
      entryDate: record.entryDate,
      description: record.description,
      sourceType: record.sourceType,
      sourceId: record.sourceId,
      reversalOfEntryId: record.reversalOfEntryId,
      reversedByEntryId: record.reversedByEntryId,
      reversedAt: record.reversedAt,
      createdByUserId: record.createdByUserId,
      correlationId: record.correlationId,
      createdAt: record.createdAt,
    });
  }
}
