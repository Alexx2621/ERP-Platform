import { Body, Controller, Get, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateSalesReturnUseCase } from "../application/use-cases/create-sales-return.use-case";
import { ListSalesReturnsUseCase } from "../application/use-cases/list-sales-returns.use-case";
import { ListSalesReturnLinesUseCase } from "../application/use-cases/list-sales-return-lines.use-case";
import { CreateSalesReturnDto, ListSalesReturnsQueryDto, SalesReturnResponseDto, SalesReturnLineResponseDto } from "./dto/sales-return.dto";
import { handleSalesError } from "./sales-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Sales")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/sales/returns")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class SalesReturnsController {
  constructor(
    private readonly createReturn: CreateSalesReturnUseCase,
    private readonly listReturns: ListSalesReturnsUseCase,
    private readonly listLines: ListSalesReturnLinesUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("sales.returns.read")
  @ApiOperation({ summary: "List returns for the active company." })
  @ApiResponse({ status: HttpStatus.OK, type: [SalesReturnResponseDto] })
  async list(
    @Query() query: ListSalesReturnsQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SalesReturnResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const returns = await this.listReturns.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { salesOrderId: query.salesOrderId, limit: query.limit ?? 50 },
      });
      return returns.map(SalesReturnResponseDto.fromDomain);
    } catch (error) {
      handleSalesError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("sales.returns.manage")
  @ApiOperation({
    summary:
      "Record a return against a FULFILLED order: posts a real RETURN inventory movement per line and rejects returning more than was ever fulfilled.",
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: SalesReturnResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "SALES_RETURN_EXCEEDS_FULFILLED_QUANTITY" })
  async create(
    @Body() dto: CreateSalesReturnDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SalesReturnResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const salesReturn = await this.createReturn.execute({
        tenantId: ctx.tenantId,
        companyId,
        actorUserId: ctx.actor.userId,
        correlationId: ctx.correlationId,
        ...dto,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "sales.return.created",
        resource: "SalesReturn",
        resourceId: salesReturn.id,
        newValues: { salesOrderId: salesReturn.salesOrderId, lines: dto.lines.length },
        correlationId: ctx.correlationId,
      });
      return SalesReturnResponseDto.fromDomain(salesReturn);
    } catch (error) {
      handleSalesError(error);
    }
  }

  @Get(":id/lines")
  @UseGuards(PermissionGuard)
  @RequirePermission("sales.returns.read")
  @ApiOperation({ summary: "List a return's lines." })
  @ApiResponse({ status: HttpStatus.OK, type: [SalesReturnLineResponseDto] })
  async listReturnLines(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SalesReturnLineResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const lines = await this.listLines.execute({ tenantId: ctx.tenantId, companyId, salesReturnId: id });
      return lines.map(SalesReturnLineResponseDto.fromDomain);
    } catch (error) {
      handleSalesError(error);
    }
  }
}
