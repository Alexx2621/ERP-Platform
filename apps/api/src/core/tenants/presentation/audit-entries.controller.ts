import { Controller, Get, Query, UseGuards } from "@nestjs/common";
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
import type { TenantExecutionContext } from "../application/tenant-execution-context";

/**
 * Physically lives in tenants/ for the same reason as RolesController: it
 * needs SessionAuthGuard + TenantContextGuard + CurrentTenantContext, and
 * AuditModule is a zero-dependency leaf that must not import Tenants back
 * (see audit.module.ts's docstring). Only returns tenant-scoped entries —
 * see ListAuditEntriesUseCase's docstring for what that excludes.
 */
@Controller("api/v1/audit-entries")
@UseGuards(SessionAuthGuard, TenantContextGuard, PermissionGuard)
export class AuditEntriesController {
  constructor(private readonly listAuditEntries: ListAuditEntriesUseCase) {}

  @Get()
  @RequirePermission("audit.entries.read")
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
