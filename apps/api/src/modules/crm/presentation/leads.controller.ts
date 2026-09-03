import { Body, Controller, Get, HttpStatus, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateLeadUseCase } from "../application/use-cases/create-lead.use-case";
import { UpdateLeadUseCase } from "../application/use-cases/update-lead.use-case";
import { SetLeadStatusUseCase } from "../application/use-cases/set-lead-status.use-case";
import { SetLeadConsentUseCase } from "../application/use-cases/set-lead-consent.use-case";
import { ConvertLeadUseCase } from "../application/use-cases/convert-lead.use-case";
import { ListLeadsUseCase } from "../application/use-cases/list-leads.use-case";
import { GetLeadUseCase } from "../application/use-cases/get-lead.use-case";
import {
  ConvertLeadResponseDto,
  CreateLeadDto,
  LeadResponseDto,
  ListLeadsQueryDto,
  SetLeadConsentDto,
  SetLeadStatusDto,
  UpdateLeadDto,
} from "./dto/lead.dto";
import { handleCrmError } from "./crm-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("CRM")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/crm/leads")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class LeadsController {
  constructor(
    private readonly createLead: CreateLeadUseCase,
    private readonly updateLead: UpdateLeadUseCase,
    private readonly setLeadStatus: SetLeadStatusUseCase,
    private readonly setLeadConsent: SetLeadConsentUseCase,
    private readonly convertLead: ConvertLeadUseCase,
    private readonly listLeads: ListLeadsUseCase,
    private readonly getLead: GetLeadUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.leads.read")
  @ApiOperation({ summary: "List the active company's leads." })
  @ApiResponse({ status: HttpStatus.OK, type: [LeadResponseDto] })
  async list(@Query() query: ListLeadsQueryDto, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<LeadResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const leads = await this.listLeads.execute({ tenantId: ctx.tenantId, companyId, filter: { status: query.status, ownerId: query.ownerId, limit: 200 } });
      return leads.map(LeadResponseDto.fromDomain);
    } catch (error) {
      handleCrmError(error);
    }
  }

  @Get(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.leads.read")
  @ApiOperation({ summary: "Get one lead." })
  @ApiResponse({ status: HttpStatus.OK, type: LeadResponseDto })
  async get(@Param("id") id: string, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<LeadResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const lead = await this.getLead.execute(ctx.tenantId, companyId, id);
      return LeadResponseDto.fromDomain(lead);
    } catch (error) {
      handleCrmError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.leads.manage")
  @ApiOperation({ summary: "Create a lead for the active company." })
  @ApiResponse({ status: HttpStatus.CREATED, type: LeadResponseDto })
  async create(@Body() dto: CreateLeadDto, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<LeadResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const lead = await this.createLead.execute({ tenantId: ctx.tenantId, companyId, actorUserId: ctx.actor.userId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "crm.lead.created",
        resource: "Lead",
        resourceId: lead.id,
        newValues: { name: lead.name, status: lead.status },
        correlationId: ctx.correlationId,
      });
      return LeadResponseDto.fromDomain(lead);
    } catch (error) {
      handleCrmError(error);
    }
  }

  @Put(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.leads.manage")
  @ApiOperation({ summary: "Update a lead's contact fields." })
  @ApiResponse({ status: HttpStatus.OK, type: LeadResponseDto })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<LeadResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const lead = await this.updateLead.execute({ tenantId: ctx.tenantId, companyId, id, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "crm.lead.updated",
        resource: "Lead",
        resourceId: lead.id,
        newValues: { name: lead.name },
        correlationId: ctx.correlationId,
      });
      return LeadResponseDto.fromDomain(lead);
    } catch (error) {
      handleCrmError(error);
    }
  }

  @Put(":id/status")
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.leads.manage")
  @ApiOperation({ summary: "Move a lead through its non-terminal statuses (NEW/CONTACTED/QUALIFIED) or mark it LOST." })
  @ApiResponse({ status: HttpStatus.OK, type: LeadResponseDto })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: SetLeadStatusDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<LeadResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const lead = await this.setLeadStatus.execute({ tenantId: ctx.tenantId, companyId, id, status: dto.status });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "crm.lead.status_changed",
        resource: "Lead",
        resourceId: lead.id,
        newValues: { status: lead.status },
        correlationId: ctx.correlationId,
      });
      return LeadResponseDto.fromDomain(lead);
    } catch (error) {
      handleCrmError(error);
    }
  }

  @Put(":id/consent")
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.leads.manage")
  @ApiOperation({ summary: "Grant or revoke a lead's marketing consent." })
  @ApiResponse({ status: HttpStatus.OK, type: LeadResponseDto })
  async updateConsent(
    @Param("id") id: string,
    @Body() dto: SetLeadConsentDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<LeadResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const lead = await this.setLeadConsent.execute({ tenantId: ctx.tenantId, companyId, id, consentMarketing: dto.consentMarketing });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "crm.lead.consent_changed",
        resource: "Lead",
        resourceId: lead.id,
        newValues: { consentMarketing: lead.consentMarketing },
        correlationId: ctx.correlationId,
      });
      return LeadResponseDto.fromDomain(lead);
    } catch (error) {
      handleCrmError(error);
    }
  }

  @Post(":id/convert")
  @UseGuards(PermissionGuard)
  @RequirePermission("crm.leads.manage")
  @ApiOperation({ summary: "Convert a lead to a real Customer — resolves an existing customer by email or creates a new one." })
  @ApiResponse({ status: HttpStatus.CREATED, type: ConvertLeadResponseDto })
  async convert(@Param("id") id: string, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<ConvertLeadResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const { lead, customer, wasExistingCustomer } = await this.convertLead.execute({ tenantId: ctx.tenantId, companyId, id });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "crm.lead.converted",
        resource: "Lead",
        resourceId: lead.id,
        newValues: { customerId: customer.id, wasExistingCustomer },
        correlationId: ctx.correlationId,
      });
      const dto = new ConvertLeadResponseDto();
      dto.lead = LeadResponseDto.fromDomain(lead);
      dto.customerId = customer.id;
      dto.wasExistingCustomer = wasExistingCustomer;
      return dto;
    } catch (error) {
      handleCrmError(error);
    }
  }
}
