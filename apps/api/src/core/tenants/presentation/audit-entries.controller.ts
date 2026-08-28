import { Controller, Get, HttpStatus, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SessionAuthGuard } from "../../auth";
import {
  ListAuditEntriesUseCase,
  AuditEntry,
  AuditEntryResponseDto,
  ListAuditEntriesDto,
} from "../../audit";
import { PermissionGuard, RequirePermission } from "../../access-control";
import { TenantContextGuard } from "./tenant-context.guard";
import { CurrentTenantContext } from "./current-tenant-context.decorator";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import type { TenantExecutionContext } from "../application/tenant-execution-context";

/**
 * Physically lives in tenants/ for the same reason as RolesController: it
 * needs SessionAuthGuard + TenantContextGuard + CurrentTenantContext, and
 * AuditModule is a zero-dependency leaf that must not import Tenants back
 * (see audit.module.ts's docstring). Only returns tenant-scoped entries —
 * see ListAuditEntriesUseCase's docstring for what that excludes.
 */
@ApiTags("Audit")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/audit-entries")
@UseGuards(SessionAuthGuard, TenantContextGuard, PermissionGuard)
export class AuditEntriesController {
  constructor(private readonly listAuditEntries: ListAuditEntriesUseCase) {}

  @Get()
  @RequirePermission("audit.entries.read")
  @ApiOperation({ summary: "The tenant's audit trail, newest first (max 200 entries)." })
  @ApiResponse({ status: HttpStatus.OK, type: [AuditEntryResponseDto] })
  async list(
    @Query() query: ListAuditEntriesDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<AuditEntryResponseDto[]> {
    const entries: AuditEntry[] = await this.listAuditEntries.execute({
      tenantId: ctx.tenantId,
      limit: query.limit,
    });
    return entries.map(AuditEntryResponseDto.fromDomain);
  }
}
