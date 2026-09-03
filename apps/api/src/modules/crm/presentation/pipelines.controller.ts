import { Body, Controller, Get, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { AppEnablementGuard, RequireApp } from "../../../core/app-registry";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreatePipelineUseCase } from "../application/use-cases/create-pipeline.use-case";
import { AddPipelineStageUseCase } from "../application/use-cases/add-pipeline-stage.use-case";
import { ListPipelinesUseCase } from "../application/use-cases/list-pipelines.use-case";
import { ListPipelineStagesUseCase } from "../application/use-cases/list-pipeline-stages.use-case";
import { SetPipelineStatusUseCase } from "../application/use-cases/set-pipeline-status.use-case";
import { GetPipelineSummaryUseCase } from "../application/use-cases/get-pipeline-summary.use-case";
import { AddPipelineStageDto, CreatePipelineDto, PipelineResponseDto, PipelineStageResponseDto, SetPipelineStatusDto } from "./dto/pipeline.dto";
import { PipelineSummaryResponseDto } from "./dto/report.dto";
import { handleCrmError } from "./crm-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("CRM")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/crm/pipelines")
@UseGuards(SessionAuthGuard, TenantContextGuard, AppEnablementGuard)
@RequireApp("crm")
export class PipelinesController {
  constructor(
    private readonly createPipeline: CreatePipelineUseCase,
    private readonly addPipelineStage: AddPipelineStageUseCase,
    private readonly listPipelines: ListPipelinesUseCase,
    private readonly listPipelineStages: ListPipelineStagesUseCase,
    private readonly setPipelineStatus: SetPipelineStatusUseCase,
    private readonly getPipelineSummary: GetPipelineSummaryUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.pipelines.read")
  @ApiOperation({ summary: "List the active company's pipelines." })
  @ApiResponse({ status: HttpStatus.OK, type: [PipelineResponseDto] })
  async list(@CurrentTenantContext() ctx: TenantExecutionContext): Promise<PipelineResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const pipelines = await this.listPipelines.execute(ctx.tenantId, companyId);
      return pipelines.map(PipelineResponseDto.fromDomain);
    } catch (error) {
      handleCrmError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.pipelines.manage")
  @ApiOperation({ summary: "Create a pipeline for the active company." })
  @ApiResponse({ status: HttpStatus.CREATED, type: PipelineResponseDto })
  async create(@Body() dto: CreatePipelineDto, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<PipelineResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const pipeline = await this.createPipeline.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "crm.pipeline.created",
        resource: "Pipeline",
        resourceId: pipeline.id,
        newValues: { code: pipeline.code, name: pipeline.name },
        correlationId: ctx.correlationId,
      });
      return PipelineResponseDto.fromDomain(pipeline);
    } catch (error) {
      handleCrmError(error);
    }
  }

  @Put(":id/status")
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.pipelines.manage")
  @ApiOperation({ summary: "Activate or deactivate a pipeline." })
  @ApiResponse({ status: HttpStatus.OK, type: PipelineResponseDto })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: SetPipelineStatusDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PipelineResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const pipeline = await this.setPipelineStatus.execute({ tenantId: ctx.tenantId, companyId, id, status: dto.status });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "crm.pipeline.status_changed",
        resource: "Pipeline",
        resourceId: pipeline.id,
        newValues: { status: pipeline.status },
        correlationId: ctx.correlationId,
      });
      return PipelineResponseDto.fromDomain(pipeline);
    } catch (error) {
      handleCrmError(error);
    }
  }

  @Get(":id/stages")
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.pipelines.read")
  @ApiOperation({ summary: "List a pipeline's stages, in order." })
  @ApiResponse({ status: HttpStatus.OK, type: [PipelineStageResponseDto] })
  async listStages(@Param("id") id: string, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<PipelineStageResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const stages = await this.listPipelineStages.execute(ctx.tenantId, companyId, id);
      return stages.map(PipelineStageResponseDto.fromDomain);
    } catch (error) {
      handleCrmError(error);
    }
  }

  @Post(":id/stages")
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.pipelines.manage")
  @ApiOperation({ summary: "Append a new stage to a pipeline." })
  @ApiResponse({ status: HttpStatus.CREATED, type: PipelineStageResponseDto })
  async addStage(
    @Param("id") id: string,
    @Body() dto: AddPipelineStageDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PipelineStageResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const stage = await this.addPipelineStage.execute({ tenantId: ctx.tenantId, companyId, pipelineId: id, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "crm.pipeline_stage.added",
        resource: "PipelineStage",
        resourceId: stage.id,
        newValues: { pipelineId: id, name: stage.name, isWon: stage.isWon, isLost: stage.isLost },
        correlationId: ctx.correlationId,
      });
      return PipelineStageResponseDto.fromDomain(stage);
    } catch (error) {
      handleCrmError(error);
    }
  }

  @Get(":id/summary")
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.pipelines.read")
  @ApiOperation({ summary: "Open opportunity value per stage, summed fresh from the ledger of real opportunities." })
  @ApiResponse({ status: HttpStatus.OK, type: PipelineSummaryResponseDto })
  async summary(@Param("id") id: string, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<PipelineSummaryResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const result = await this.getPipelineSummary.execute(ctx.tenantId, companyId, id);
      return PipelineSummaryResponseDto.fromResult(result);
    } catch (error) {
      handleCrmError(error);
    }
  }
}
