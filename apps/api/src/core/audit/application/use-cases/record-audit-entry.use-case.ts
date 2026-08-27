import { Inject, Injectable, Logger } from "@nestjs/common";
import { newId } from "@erp/database";
import { AuditEntry } from "../../domain/audit-entry.entity";
import { AUDIT_ENTRY_REPOSITORY, AuditEntryRepository } from "../../domain/audit-entry.repository";

export interface RecordAuditEntryInput {
  userId: string | null;
  tenantId: string | null;
  companyId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  previousValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId: string;
}

/**
 * The only way an AuditEntry is ever created. Deliberately never throws:
 * callers invoke this as a best-effort side effect right after their own
 * state-changing write already succeeded (docs/SECURITY.md "Audit" section),
 * and a transient audit-write failure must not turn an already-successful
 * user-facing action into a 500. A failure is logged server-side instead —
 * this is Foundation-scale pragmatism, not silent data loss tolerance: see
 * the documented limitation about this not sharing a DB transaction with
 * the action it records.
 */
@Injectable()
export class RecordAuditEntryUseCase {
  private readonly logger = new Logger(RecordAuditEntryUseCase.name);

  constructor(@Inject(AUDIT_ENTRY_REPOSITORY) private readonly entries: AuditEntryRepository) {}

  async execute(input: RecordAuditEntryInput): Promise<void> {
    try {
      const entry = AuditEntry.create({
        id: newId(),
        userId: input.userId,
        tenantId: input.tenantId,
        companyId: input.companyId ?? null,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId ?? null,
        previousValues: input.previousValues ?? null,
        newValues: input.newValues ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        correlationId: input.correlationId,
        createdAt: new Date(),
      });
      await this.entries.record(entry);
    } catch (error) {
      this.logger.error(
        `Failed to record audit entry for action "${input.action}" (correlationId=${input.correlationId})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
