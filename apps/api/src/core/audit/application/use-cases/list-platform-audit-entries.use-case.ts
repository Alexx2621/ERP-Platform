import { Inject, Injectable } from "@nestjs/common";
import { AuditEntry } from "../../domain/audit-entry.entity";
import { AUDIT_ENTRY_REPOSITORY, AuditEntryRepository } from "../../domain/audit-entry.repository";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * The counterpart to ListAuditEntriesUseCase for entries that have no
 * tenant at all (login, logout, user status changes — recorded with
 * `tenantId: null`, docs/MULTITENANCY.md §4.8). Only reachable behind
 * PlatformAdminGuard (docs/DECISIONS.md ADR-007).
 */
@Injectable()
export class ListPlatformAuditEntriesUseCase {
  constructor(@Inject(AUDIT_ENTRY_REPOSITORY) private readonly entries: AuditEntryRepository) {}

  execute(limit?: number): Promise<AuditEntry[]> {
    const boundedLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    return this.entries.findPlatformScoped(boundedLimit);
  }
}
