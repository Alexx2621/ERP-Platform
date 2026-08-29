import { AuditEntry } from "../domain/audit-entry.entity";
import { AuditEntryRepository, FindAuditEntriesQuery } from "../domain/audit-entry.repository";

export class InMemoryAuditEntryRepository implements AuditEntryRepository {
  private readonly entries: AuditEntry[] = [];

  async record(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }

  async findByTenant(query: FindAuditEntriesQuery): Promise<AuditEntry[]> {
    return this.entries
      .filter((entry) => entry.tenantId === query.tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, query.limit);
  }

  async findPlatformScoped(limit: number): Promise<AuditEntry[]> {
    return this.entries
      .filter((entry) => entry.tenantId === null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}
