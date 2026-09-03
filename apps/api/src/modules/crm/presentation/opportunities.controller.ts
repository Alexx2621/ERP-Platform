import { Body, Controller, Get, HttpStatus, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { AppEnablementGuard, RequireApp } from "../../../core/app-registry";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateOpportunityUseCase } from "../application/use-cases/create-opportunity.use-case";
import { MoveOpportunityStageUseCase } from "../application/use-cases/move-opportunity-stage.use-case";
import { UpdateOpportunityUseCase } from "../application/use-cases/update-opportunity.use-case";
import { ListOpportunitiesUseCase } from "../application/use-cases/list-opportunities.use-case";
import { GetOpportunityUseCase } from "../application/use-cases/get-opportunity.use-case";
import {
  CreateOpportunityDto,
  ListOpportunitiesQueryDto,
  MoveOpportunityStageDto,
  OpportunityResponseDto,
  UpdateOpportunityDto,
} from "./dto/opportunity.dto";
import { handleCrmError } from "./crm-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("CRM")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/crm/opportunities")
@UseGuards(SessionAuthGuard, TenantContextGuard, AppEnablementGuard)
@RequireApp("crm")
export class OpportunitiesController {
  constructor(
    private readonly createOpportunity: CreateOpportunityUseCase,
    private readonly moveOpportunityStage: MoveOpportunityStageUseCase,
    private readonly updateOpportunity: UpdateOpportunityUseCase,
    private readonly listOpportunities: ListOpportunitiesUseCase,
    private readonly getOpportunity: GetOpportunityUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.opportunities.read")
  @ApiOperation({ summary: "List the active company's opportunities." })
  @ApiResponse({ status: HttpStatus.OK, type: [OpportunityResponseDto] })
  async list(@Query() query: ListOpportunitiesQueryDto, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<OpportunityResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const opportunities = await this.listOpportunities.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { pipelineId: query.pipelineId, stageId: query.stageId, status: query.status, ownerId: query.ownerId, limit: 200 },
      });
      return opportunities.map(OpportunityResponseDto.fromDomain);
    } catch (error) {
      handleCrmError(error);
    }
  }

  @Get(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.opportunities.read")
  @ApiOperation({ summary: "Get one opportunity." })
  @ApiResponse({ status: HttpStatus.OK, type: OpportunityResponseDto })
  async get(@Param("id") id: string, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<OpportunityResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const opportunity = await this.getOpportunity.execute(ctx.tenantId, companyId, id);
      return OpportunityResponseDto.fromDomain(opportunity);
    } catch (error) {
      handleCrmError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.opportunities.manage")
  @ApiOperation({ summary: "Open an opportunity in a pipeline stage." })
  @ApiResponse({ status: HttpStatus.CREATED, type: OpportunityResponseDto })
  async create(@Body() dto: CreateOpportunityDto, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<OpportunityResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const opportunity = await this.createOpportunity.execute({ tenantId: ctx.tenantId, companyId, actorUserId: ctx.actor.userId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "crm.opportunity.created",
        resource: "Opportunity",
        resourceId: opportunity.id,
        newValues: { name: opportunity.name, amount: opportunity.amount, stageId: opportunity.stageId },
        correlationId: ctx.correlationId,
      });
      return OpportunityResponseDto.fromDomain(opportunity);
    } catch (error) {
      handleCrmError(error);
    }
  }

  @Put(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.opportunities.manage")
  @ApiOperation({ summary: "Update an OPEN opportunity's name, amount and expected close date." })
  @ApiResponse({ status: HttpStatus.OK, type: OpportunityResponseDto })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateOpportunityDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<OpportunityResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const opportunity = await this.updateOpportunity.execute({ tenantId: ctx.tenantId, companyId, id, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "crm.opportunity.updated",
        resource: "Opportunity",
        resourceId: opportunity.id,
        newValues: { name: opportunity.name, amount: opportunity.amount },
        correlationId: ctx.correlationId,
      });
      return OpportunityResponseDto.fromDomain(opportunity);
    } catch (error) {
      handleCrmError(error);
    }
  }

  @Put(":id/stage")
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.opportunities.manage")
  @ApiOperation({ summary: "Move an opportunity to a different stage of its own pipeline — a won/lost stage closes it in the same step." })
  @ApiResponse({ status: HttpStatus.OK, type: OpportunityResponseDto })
  async moveStage(
    @Param("id") id: string,
    @Body() dto: MoveOpportunityStageDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<OpportunityResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const opportunity = await this.moveOpportunityStage.execute({ tenantId: ctx.tenantId, companyId, id, stageId: dto.stageId });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "crm.opportunity.stage_moved",
        resource: "Opportunity",
        resourceId: opportunity.id,
        newValues: { stageId: opportunity.stageId, status: opportunity.status },
        correlationId: ctx.correlationId,
      });
      return OpportunityResponseDto.fromDomain(opportunity);
    } catch (error) {
      handleCrmError(error);
    }
  }
}
