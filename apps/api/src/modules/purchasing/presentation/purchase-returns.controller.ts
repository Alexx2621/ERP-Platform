import { Body, Controller, Get, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreatePurchaseReturnUseCase } from "../application/use-cases/create-purchase-return.use-case";
import { ListPurchaseReturnsUseCase } from "../application/use-cases/list-purchase-returns.use-case";
import { ListPurchaseReturnLinesUseCase } from "../application/use-cases/list-purchase-return-lines.use-case";
import {
  CreatePurchaseReturnDto,
  ListPurchaseReturnsQueryDto,
  PurchaseReturnResponseDto,
  PurchaseReturnLineResponseDto,
} from "./dto/purchase-return.dto";
import { handlePurchasingError } from "./purchasing-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Purchasing")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/purchasing/returns")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class PurchaseReturnsController {
  constructor(
    private readonly createReturn: CreatePurchaseReturnUseCase,
    private readonly listReturns: ListPurchaseReturnsUseCase,
    private readonly listLines: ListPurchaseReturnLinesUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("purchasing.returns.read")
  @ApiOperation({ summary: "List returns to suppliers for the active company." })
  @ApiResponse({ status: HttpStatus.OK, type: [PurchaseReturnResponseDto] })
  async list(
    @Query() query: ListPurchaseReturnsQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PurchaseReturnResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const returns = await this.listReturns.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { purchaseOrderId: query.purchaseOrderId, limit: query.limit ?? 50 },
      });
      return returns.map(PurchaseReturnResponseDto.fromDomain);
    } catch (error) {
      handlePurchasingError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("purchasing.returns.manage")
  @ApiOperation({
    summary:
      "Record a return to the supplier: posts a real ISSUE inventory movement per line and rejects returning more than was ever received (minus already returned).",
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: PurchaseReturnResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "PURCHASE_RETURN_EXCEEDS_RECEIVED_QUANTITY" })
  async create(
    @Body() dto: CreatePurchaseReturnDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PurchaseReturnResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const purchaseReturn = await this.createReturn.execute({
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
        action: "purchasing.return.created",
        resource: "PurchaseReturn",
        resourceId: purchaseReturn.id,
        newValues: { purchaseOrderId: purchaseReturn.purchaseOrderId, lines: dto.lines.length },
        correlationId: ctx.correlationId,
      });
      return PurchaseReturnResponseDto.fromDomain(purchaseReturn);
    } catch (error) {
      handlePurchasingError(error);
    }
  }

  @Get(":id/lines")
  @UseGuards(PermissionGuard)
  @RequirePermission("purchasing.returns.read")
  @ApiOperation({ summary: "List a return's lines." })
  @ApiResponse({ status: HttpStatus.OK, type: [PurchaseReturnLineResponseDto] })
  async listReturnLines(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PurchaseReturnLineResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const lines = await this.listLines.execute({ tenantId: ctx.tenantId, companyId, purchaseReturnId: id });
      return lines.map(PurchaseReturnLineResponseDto.fromDomain);
    } catch (error) {
      handlePurchasingError(error);
    }
  }
}
