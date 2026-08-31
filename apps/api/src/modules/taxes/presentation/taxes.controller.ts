import { Body, Controller, Get, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateTaxUseCase } from "../application/use-cases/create-tax.use-case";
import { UpdateTaxUseCase } from "../application/use-cases/update-tax.use-case";
import { ListTaxesUseCase } from "../application/use-cases/list-taxes.use-case";
import { SetTaxStatusUseCase } from "../application/use-cases/set-tax-status.use-case";
import { CreateTaxDto, SetTaxStatusDto, TaxResponseDto, UpdateTaxDto } from "./dto/tax.dto";
import { handleTaxError } from "./taxes-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Taxes")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/taxes")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class TaxesController {
  constructor(
    private readonly createTax: CreateTaxUseCase,
    private readonly updateTax: UpdateTaxUseCase,
    private readonly listTaxes: ListTaxesUseCase,
    private readonly setStatus: SetTaxStatusUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("taxes.read")
  @ApiOperation({ summary: "List the active company's taxes." })
  @ApiResponse({ status: HttpStatus.OK, type: [TaxResponseDto] })
  async list(@CurrentTenantContext() ctx: TenantExecutionContext): Promise<TaxResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const taxes = await this.listTaxes.execute(ctx.tenantId, companyId);
      return taxes.map(TaxResponseDto.fromDomain);
    } catch (error) {
      handleTaxError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("taxes.manage")
  @ApiOperation({ summary: "Create a tax for the active company." })
  @ApiResponse({ status: HttpStatus.CREATED, type: TaxResponseDto })
  async create(
    @Body() dto: CreateTaxDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<TaxResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const tax = await this.createTax.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "taxes.tax.created",
        resource: "Tax",
        resourceId: tax.id,
        newValues: { code: tax.code, name: tax.name, rate: tax.rate },
        correlationId: ctx.correlationId,
      });
      return TaxResponseDto.fromDomain(tax);
    } catch (error) {
      handleTaxError(error);
    }
  }

  @Put(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("taxes.manage")
  @ApiOperation({ summary: "Rename or re-rate a tax." })
  @ApiResponse({ status: HttpStatus.OK, type: TaxResponseDto })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTaxDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<TaxResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const tax = await this.updateTax.execute({ tenantId: ctx.tenantId, companyId, id, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "taxes.tax.updated",
        resource: "Tax",
        resourceId: tax.id,
        newValues: { name: tax.name, rate: tax.rate },
        correlationId: ctx.correlationId,
      });
      return TaxResponseDto.fromDomain(tax);
    } catch (error) {
      handleTaxError(error);
    }
  }

  @Put(":id/status")
  @UseGuards(PermissionGuard)
  @RequirePermission("taxes.manage")
  @ApiOperation({ summary: "Activate or deactivate a tax." })
  @ApiResponse({ status: HttpStatus.OK, type: TaxResponseDto })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: SetTaxStatusDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<TaxResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const tax = await this.setStatus.execute({ tenantId: ctx.tenantId, companyId, id, status: dto.status });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "taxes.tax.status_changed",
        resource: "Tax",
        resourceId: tax.id,
        newValues: { status: tax.status },
        correlationId: ctx.correlationId,
      });
      return TaxResponseDto.fromDomain(tax);
    } catch (error) {
      handleTaxError(error);
    }
  }
}
