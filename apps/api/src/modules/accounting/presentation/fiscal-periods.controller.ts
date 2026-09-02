import { Body, Controller, Get, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateFiscalPeriodUseCase } from "../application/use-cases/create-fiscal-period.use-case";
import { CloseFiscalPeriodUseCase } from "../application/use-cases/close-fiscal-period.use-case";
import { ListFiscalPeriodsUseCase } from "../application/use-cases/list-fiscal-periods.use-case";
import { CreateFiscalPeriodDto, FiscalPeriodResponseDto } from "./dto/fiscal-period.dto";
import { handleAccountingError } from "./accounting-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Accounting")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/accounting/fiscal-periods")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class FiscalPeriodsController {
  constructor(
    private readonly createFiscalPeriod: CreateFiscalPeriodUseCase,
    private readonly closeFiscalPeriod: CloseFiscalPeriodUseCase,
    private readonly listFiscalPeriods: ListFiscalPeriodsUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("accounting.periods.read")
  @ApiOperation({ summary: "List the active company's fiscal periods." })
  @ApiResponse({ status: HttpStatus.OK, type: [FiscalPeriodResponseDto] })
  async list(@CurrentTenantContext() ctx: TenantExecutionContext): Promise<FiscalPeriodResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const periods = await this.listFiscalPeriods.execute({ tenantId: ctx.tenantId, companyId, filter: { limit: 200 } });
      return periods.map(FiscalPeriodResponseDto.fromDomain);
    } catch (error) {
      handleAccountingError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("accounting.periods.manage")
  @ApiOperation({ summary: "Open a new fiscal period for the active company." })
  @ApiResponse({ status: HttpStatus.CREATED, type: FiscalPeriodResponseDto })
  async create(@Body() dto: CreateFiscalPeriodDto, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<FiscalPeriodResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const period = await this.createFiscalPeriod.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "accounting.fiscal_period.created",
        resource: "FiscalPeriod",
        resourceId: period.id,
        newValues: { code: period.code, name: period.name, startDate: period.startDate.toISOString(), endDate: period.endDate.toISOString() },
        correlationId: ctx.correlationId,
      });
      return FiscalPeriodResponseDto.fromDomain(period);
    } catch (error) {
      handleAccountingError(error);
    }
  }

  @Post(":id/close")
  @UseGuards(PermissionGuard)
  @RequirePermission("accounting.periods.manage")
  @ApiOperation({ summary: "Close a fiscal period — permanently blocks new postings against it." })
  @ApiResponse({ status: HttpStatus.OK, type: FiscalPeriodResponseDto })
  async close(@Param("id") id: string, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<FiscalPeriodResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const period = await this.closeFiscalPeriod.execute({ tenantId: ctx.tenantId, companyId, id });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "accounting.fiscal_period.closed",
        resource: "FiscalPeriod",
        resourceId: period.id,
        newValues: { status: period.status },
        correlationId: ctx.correlationId,
      });
      return FiscalPeriodResponseDto.fromDomain(period);
    } catch (error) {
      handleAccountingError(error);
    }
  }
}
