import { Module } from "@nestjs/common";
import { AUDIT_ENTRY_REPOSITORY } from "./domain/audit-entry.repository";
import { PrismaAuditEntryRepository } from "./infrastructure/prisma-audit-entry.repository";
import { RecordAuditEntryUseCase } from "./application/use-cases/record-audit-entry.use-case";
import { ListAuditEntriesUseCase } from "./application/use-cases/list-audit-entries.use-case";

/**
 * Deliberately has ZERO dependency on any other core module — the same
 * "leaf" shape as AccessControlModule. Every module that needs to record an
 * audit entry for its own actions (Auth, Users, Tenants, Access Control,
 * Configuration) imports AuditModule directly; since Audit never imports
 * anything back, none of those imports can create a cycle, no matter how
 * many modules depend on it or what they in turn depend on.
 *
 * There is no controller here. The read endpoint (GET /api/v1/audit-entries)
 * needs SessionAuthGuard + TenantContextGuard + PermissionGuard, so — same
 * reasoning as RolesController — it's registered by TenantsModule instead:
 * see tenants/presentation/audit-entries.controller.ts.
 */
@Module({
  providers: [
    { provide: AUDIT_ENTRY_REPOSITORY, useClass: PrismaAuditEntryRepository },
    RecordAuditEntryUseCase,
    ListAuditEntriesUseCase,
  ],
  exports: [RecordAuditEntryUseCase, ListAuditEntriesUseCase],
})
export class AuditModule {}
