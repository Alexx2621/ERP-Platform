import { Body, Controller, Get, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { AppEnablementGuard, RequireApp } from "../../../core/app-registry";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateActivityUseCase } from "../application/use-cases/create-activity.use-case";
import { CompleteActivityUseCase } from "../application/use-cases/complete-activity.use-case";
import { ListActivitiesUseCase } from "../application/use-cases/list-activities.use-case";
import { ActivityResponseDto, CreateActivityDto, ListActivitiesQueryDto } from "./dto/activity.dto";
import { handleCrmError } from "./crm-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("CRM")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/crm/activities")
@UseGuards(SessionAuthGuard, TenantContextGuard, AppEnablementGuard)
@RequireApp("crm")
export class ActivitiesController {
  constructor(
    private readonly createActivity: CreateActivityUseCase,
    private readonly completeActivity: CompleteActivityUseCase,
    private readonly listActivities: ListActivitiesUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.activities.read")
  @ApiOperation({ summary: "List activities logged against a lead, an opportunity, or a customer." })
  @ApiResponse({ status: HttpStatus.OK, type: [ActivityResponseDto] })
  async list(@Query() query: ListActivitiesQueryDto, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<ActivityResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const activities = await this.listActivities.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { relatedLeadId: query.relatedLeadId, relatedOpportunityId: query.relatedOpportunityId, relatedCustomerId: query.relatedCustomerId, limit: 200 },
      });
      return activities.map(ActivityResponseDto.fromDomain);
    } catch (error) {
      handleCrmError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.activities.manage")
  @ApiOperation({ summary: "Log an activity against exactly one of a lead, an opportunity, or a customer." })
  @ApiResponse({ status: HttpStatus.CREATED, type: ActivityResponseDto })
  async create(@Body() dto: CreateActivityDto, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<ActivityResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const activity = await this.createActivity.execute({ tenantId: ctx.tenantId, companyId, actorUserId: ctx.actor.userId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "crm.activity.created",
        resource: "Activity",
        resourceId: activity.id,
        newValues: { type: activity.type, subject: activity.subject },
        correlationId: ctx.correlationId,
      });
      return ActivityResponseDto.fromDomain(activity);
    } catch (error) {
      handleCrmError(error);
    }
  }

  @Post(":id/complete")
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.activities.manage")
  @ApiOperation({ summary: "Mark an activity as completed." })
  @ApiResponse({ status: HttpStatus.OK, type: ActivityResponseDto })
  async complete(@Param("id") id: string, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<ActivityResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const activity = await this.completeActivity.execute({ tenantId: ctx.tenantId, companyId, id });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "crm.activity.completed",
        resource: "Activity",
        resourceId: activity.id,
        newValues: { completedAt: activity.completedAt },
        correlationId: ctx.correlationId,
      });
      return ActivityResponseDto.fromDomain(activity);
    } catch (error) {
      handleCrmError(error);
    }
  }
}
