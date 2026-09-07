import { Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { PrismaService } from "../prisma/prisma.service";
import {
  AllocateDocumentNumberInput,
  DocumentNumberAllocator,
  formatDocumentNumber,
} from "./document-number.port";

/**
 * Prisma-backed implementation of {@link DocumentNumberAllocator}.
 *
 * Lives in `shared/` rather than inside one business module on purpose: the
 * mechanism is technical infrastructure with a business-visible output, and
 * Purchasing/POS/Commerce all want the same correlative behavior. Only
 * Sales is wired to it today (the pilot) — the others keep their current
 * behavior until they are migrated deliberately, rather than duplicating
 * this concurrency-critical logic per module later.
 *
 * Concurrency: the counter row is incremented under `SELECT ... FOR UPDATE`
 * inside its own short transaction, the same row-locking pattern
 * `PrismaInventoryBalanceRepository.applyMovement` already uses. Two
 * simultaneous creates therefore serialize on that row and can never be
 * handed the same number — MASTER_SPEC §35 lists "correlativos" as
 * concurrency-critical alongside inventory and payments.
 *
 * Deliberately NOT gapless: the number commits before the document row is
 * written, so a failure in between burns that number and leaves a hole in
 * the sequence. Fiscal-grade gapless numbering would require committing the
 * counter in the *same* transaction as the document (serializing every
 * create on one row for the whole document write) plus a documented
 * recovery procedure — a materially harder problem this does not claim to
 * solve, and one no jurisdiction requirement in this codebase asks for yet.
 */
@Injectable()
export class DocumentNumberService implements DocumentNumberAllocator {
  constructor(private readonly prisma: PrismaService) {}

  async allocate(input: AllocateDocumentNumberInput): Promise<string> {
    const { tenantId, companyId, documentType, prefix } = input;

    return this.prisma.$transaction(async (transaction) => {
      // Create the counter on first use. ON CONFLICT DO NOTHING keeps this
      // safe when two companies (or two concurrent callers) reach it at the
      // same time — the unique index is the real arbiter, not a prior read.
      await transaction.$executeRaw`
        INSERT INTO document_sequences (id, tenant_id, company_id, document_type, prefix, next_value, created_at, updated_at)
        VALUES (${newId()}::uuid, ${tenantId}::uuid, ${companyId}::uuid, ${documentType}, ${prefix}, 1, now(), now())
        ON CONFLICT (tenant_id, company_id, document_type) DO NOTHING
      `;

      const rows = await transaction.$queryRaw<Array<{ next_value: number }>>`
        SELECT next_value FROM document_sequences
        WHERE tenant_id = ${tenantId}::uuid
          AND company_id = ${companyId}::uuid
          AND document_type = ${documentType}
        FOR UPDATE
      `;
      const nextValue = rows[0]?.next_value ?? 1;

      await transaction.$executeRaw`
        UPDATE document_sequences
        SET next_value = ${nextValue + 1}, updated_at = now()
        WHERE tenant_id = ${tenantId}::uuid
          AND company_id = ${companyId}::uuid
          AND document_type = ${documentType}
      `;

      return formatDocumentNumber(prefix, nextValue);
    });
  }
}
