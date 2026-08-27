import type { AuditEntry } from "./audit-entry.entity";

export const AUDIT_ENTRY_REPOSITORY = Symbol("AUDIT_ENTRY_REPOSITORY");

export interface FindAuditEntriesQuery {
  tenantId: string;
  limit: number;
}

/** Deliberately no update/delete methods — see AuditEntry's docstring. */
export interface AuditEntryRepository {
  record(entry: AuditEntry): Promise<void>;
  findByTenant(query: FindAuditEntriesQuery): Promise<AuditEntry[]>;
}
