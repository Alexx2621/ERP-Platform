import { Inject, Injectable } from "@nestjs/common";
import { AuditEntry } from "../../domain/audit-entry.entity";
import { AUDIT_ENTRY_REPOSITORY, AuditEntryRepository } from "../../domain/audit-entry.repository";

export interface ListAuditEntriesInput {
  tenantId: string;
  limit?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Only returns tenant-scoped entries. Auth/Users actions (login, logout,
 * user status changes) are recorded with `tenantId: null` — see
 * docs/MULTITENANCY.md §4.8 — and are not queryable through this endpoint
 * yet; that needs a "my activity" or platform-admin surface, deliberately
 * not built in this change (docs/SECURITY.md "Audit").
 */
@Injectable()
export class ListAuditEntriesUseCase {
  constructor(@Inject(AUDIT_ENTRY_REPOSITORY) private readonly entries: AuditEntryRepository) {}

  execute(input: ListAuditEntriesInput): Promise<AuditEntry[]> {
    const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    return this.entries.findByTenant({ tenantId: input.tenantId, limit });
  }
}
