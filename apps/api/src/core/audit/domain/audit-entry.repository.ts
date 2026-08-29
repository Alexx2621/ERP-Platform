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
  /**
   * Entries recorded with `tenantId: null` — auth/user-identity actions
   * (login, logout, status changes) that have no tenant to scope them to
   * (docs/MULTITENANCY.md §4.8). Only reachable behind PlatformAdminGuard
   * (docs/DECISIONS.md ADR-007); this is the platform's own "activity" view,
   * not any tenant's.
   */
  findPlatformScoped(limit: number): Promise<AuditEntry[]>;
}
