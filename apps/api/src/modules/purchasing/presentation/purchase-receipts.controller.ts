import { Body, Controller, Get, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreatePurchaseReceiptUseCase } from "../application/use-cases/create-purchase-receipt.use-case";
import { ListPurchaseReceiptsUseCase } from "../application/use-cases/list-purchase-receipts.use-case";
import { ListPurchaseReceiptLinesUseCase } from "../application/use-cases/list-purchase-receipt-lines.use-case";
import {
  CreatePurchaseReceiptDto,
  ListPurchaseReceiptsQueryDto,
  PurchaseReceiptResponseDto,
  PurchaseReceiptLineResponseDto,
} from "./dto/purchase-receipt.dto";
import { handlePurchasingError } from "./purchasing-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Purchasing")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/purchasing/receipts")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class PurchaseReceiptsController {
  constructor(
    private readonly createReceipt: CreatePurchaseReceiptUseCase,
    private readonly listReceipts: ListPurchaseReceiptsUseCase,
    private readonly listLines: ListPurchaseReceiptLinesUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("purchasing.receipts.read")
  @ApiOperation({ summary: "List receipts for the active company." })
  @ApiResponse({ status: HttpStatus.OK, type: [PurchaseReceiptResponseDto] })
  async list(
    @Query() query: ListPurchaseReceiptsQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PurchaseReceiptResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const receipts = await this.listReceipts.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { purchaseOrderId: query.purchaseOrderId, limit: query.limit ?? 50 },
      });
      return receipts.map(PurchaseReceiptResponseDto.fromDomain);
    } catch (error) {
      handlePurchasingError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("purchasing.receipts.manage")
  @ApiOperation({
    summary:
      "Record a (possibly partial) receipt against a CONFIRMED order: posts a real RECEIPT inventory movement per line and rejects receiving more than was ever ordered.",
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: PurchaseReceiptResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "PURCHASE_RECEIPT_EXCEEDS_ORDERED_QUANTITY" })
  async create(
    @Body() dto: CreatePurchaseReceiptDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PurchaseReceiptResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const receipt = await this.createReceipt.execute({
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
        action: "purchasing.receipt.created",
        resource: "PurchaseReceipt",
        resourceId: receipt.id,
        newValues: { purchaseOrderId: receipt.purchaseOrderId, lines: dto.lines.length },
        correlationId: ctx.correlationId,
      });
      return PurchaseReceiptResponseDto.fromDomain(receipt);
    } catch (error) {
      handlePurchasingError(error);
    }
  }

  @Get(":id/lines")
  @UseGuards(PermissionGuard)
  @RequirePermission("purchasing.receipts.read")
  @ApiOperation({ summary: "List a receipt's lines." })
  @ApiResponse({ status: HttpStatus.OK, type: [PurchaseReceiptLineResponseDto] })
  async listReceiptLines(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PurchaseReceiptLineResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const lines = await this.listLines.execute({ tenantId: ctx.tenantId, companyId, purchaseReceiptId: id });
      return lines.map(PurchaseReceiptLineResponseDto.fromDomain);
    } catch (error) {
      handlePurchasingError(error);
    }
  }
}
