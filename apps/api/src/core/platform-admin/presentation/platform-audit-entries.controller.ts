import { Controller, Get, HttpStatus, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  AuditEntryResponseDto,
  ListAuditEntriesDto,
  ListPlatformAuditEntriesUseCase,
} from "../../audit";
import { SessionAuthGuard } from "../../auth";
import { PlatformAdminGuard } from "./platform-admin.guard";

/**
 * The "my activity"/platform-admin view called out as a deferred backlog
 * item since Audit was first built: login/logout/user-status-change
 * entries are recorded with `tenantId: null` and were never queryable by
 * any endpoint — `AuditEntriesController` (tenant-scoped) structurally
 * cannot see them. Cross-tenant by nature, so gated by PlatformAdminGuard,
 * not TenantContextGuard/PermissionGuard.
 */
@ApiTags("Platform Administration")
@ApiBearerAuth("session")
@Controller("api/v1/platform/audit-entries")
@UseGuards(SessionAuthGuard, PlatformAdminGuard)
export class PlatformAuditEntriesController {
  constructor(private readonly listPlatformAuditEntries: ListPlatformAuditEntriesUseCase) {}

  @Get()
  @ApiOperation({ summary: "Platform-scoped audit entries (login, logout, user status changes) — no tenant owns these." })
  @ApiResponse({ status: HttpStatus.OK, type: [AuditEntryResponseDto] })
  async list(@Query() query: ListAuditEntriesDto): Promise<AuditEntryResponseDto[]> {
    const entries = await this.listPlatformAuditEntries.execute(query.limit);
    return entries.map(AuditEntryResponseDto.fromDomain);
  }
}
