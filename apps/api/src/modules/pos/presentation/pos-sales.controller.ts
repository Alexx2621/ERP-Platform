import { Body, Controller, Get, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { RingUpSaleUseCase } from "../application/use-cases/ring-up-sale.use-case";
import { ListPosSalesUseCase } from "../application/use-cases/list-pos-sales.use-case";
import { GetPosSaleUseCase } from "../application/use-cases/get-pos-sale.use-case";
import { ListPosSalesQueryDto, PosSaleResponseDto, RingUpSaleDto } from "./dto/pos-sale.dto";
import { handlePosError } from "./pos-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("POS")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/pos/sales")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class PosSalesController {
  constructor(
    private readonly ringUpSale: RingUpSaleUseCase,
    private readonly listSales: ListPosSalesUseCase,
    private readonly getSale: GetPosSaleUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("pos.sales.read")
  @ApiOperation({ summary: "List completed POS sales for the active company, optionally scoped to one shift." })
  @ApiResponse({ status: HttpStatus.OK, type: [PosSaleResponseDto] })
  async list(
    @Query() query: ListPosSalesQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PosSaleResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const sales = await this.listSales.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { shiftId: query.shiftId, limit: query.limit ?? 50 },
      });
      return sales.map(PosSaleResponseDto.fromDomain);
    } catch (error) {
      handlePosError(error);
    }
  }

  @Get(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("pos.sales.read")
  @ApiOperation({ summary: "Get one completed POS sale (e.g. to reprint a ticket)." })
  @ApiResponse({ status: HttpStatus.OK, type: PosSaleResponseDto })
  async get(@Param("id") id: string, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<PosSaleResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const sale = await this.getSale.execute(ctx.tenantId, companyId, id);
      return PosSaleResponseDto.fromDomain(sale);
    } catch (error) {
      handlePosError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("pos.sales.manage")
  @ApiOperation({
    summary:
      "Ring up a sale against an OPEN shift: creates and confirms a real SalesOrder (channel POS), captures a real Payment, and fulfills the order. Idempotent by idempotencyKey — a retried request returns the original sale instead of ringing up a second one.",
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: PosSaleResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "INSUFFICIENT_INVENTORY_FOR_ORDER or POS_PAYMENT_FAILED" })
  async ringUp(
    @Body() dto: RingUpSaleDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PosSaleResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const { posSale, wasReplayed } = await this.ringUpSale.execute({
        tenantId: ctx.tenantId,
        companyId,
        actorUserId: ctx.actor.userId,
        correlationId: ctx.correlationId,
        shiftId: dto.shiftId,
        customerId: dto.customerId,
        currency: dto.currency,
        paymentMethod: dto.paymentMethod,
        paymentReference: dto.paymentReference,
        amountTendered: dto.amountTendered,
        idempotencyKey: dto.idempotencyKey,
        lines: dto.lines,
      });
      if (!wasReplayed) {
        await this.recordAuditEntry.execute({
          userId: ctx.actor.userId,
          tenantId: ctx.tenantId,
          companyId,
          action: "pos.sale.rung_up",
          resource: "PosSale",
          resourceId: posSale.id,
          newValues: {
            shiftId: posSale.shiftId,
            salesOrderId: posSale.salesOrderId,
            paymentMethod: posSale.paymentMethod,
            amount: posSale.amount,
          },
          correlationId: ctx.correlationId,
        });
      }
      return PosSaleResponseDto.fromDomain(posSale);
    } catch (error) {
      handlePosError(error);
    }
  }
}
