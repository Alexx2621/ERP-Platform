import { Body, Controller, Get, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreatePurchaseOrderUseCase } from "../application/use-cases/create-purchase-order.use-case";
import { AddPurchaseOrderLineUseCase } from "../application/use-cases/add-purchase-order-line.use-case";
import { ListPurchaseOrdersUseCase } from "../application/use-cases/list-purchase-orders.use-case";
import { ListPurchaseOrderLinesUseCase } from "../application/use-cases/list-purchase-order-lines.use-case";
import { ConfirmPurchaseOrderUseCase } from "../application/use-cases/confirm-purchase-order.use-case";
import { ClosePurchaseOrderUseCase } from "../application/use-cases/close-purchase-order.use-case";
import { CancelPurchaseOrderUseCase } from "../application/use-cases/cancel-purchase-order.use-case";
import { CreatePurchaseOrderDto, ListPurchaseOrdersQueryDto, PurchaseOrderResponseDto } from "./dto/purchase-order.dto";
import { AddPurchaseOrderLineDto, PurchaseOrderLineResponseDto } from "./dto/purchase-order-line.dto";
import { handlePurchasingError } from "./purchasing-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Purchasing")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/purchasing/orders")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class PurchaseOrdersController {
  constructor(
    private readonly createOrder: CreatePurchaseOrderUseCase,
    private readonly addLine: AddPurchaseOrderLineUseCase,
    private readonly listOrders: ListPurchaseOrdersUseCase,
    private readonly listLines: ListPurchaseOrderLinesUseCase,
    private readonly confirmOrder: ConfirmPurchaseOrderUseCase,
    private readonly closeOrder: ClosePurchaseOrderUseCase,
    private readonly cancelOrder: CancelPurchaseOrderUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("purchasing.orders.read")
  @ApiOperation({ summary: "List purchase orders for the active company." })
  @ApiResponse({ status: HttpStatus.OK, type: [PurchaseOrderResponseDto] })
  async list(
    @Query() query: ListPurchaseOrdersQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PurchaseOrderResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const orders = await this.listOrders.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { status: query.status, supplierId: query.supplierId, limit: query.limit ?? 50 },
      });
      return orders.map(PurchaseOrderResponseDto.fromDomain);
    } catch (error) {
      handlePurchasingError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("purchasing.orders.manage")
  @ApiOperation({ summary: "Create a DRAFT purchase order." })
  @ApiResponse({ status: HttpStatus.CREATED, type: PurchaseOrderResponseDto })
  async create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PurchaseOrderResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const order = await this.createOrder.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "purchasing.order.created",
        resource: "PurchaseOrder",
        resourceId: order.id,
        newValues: { supplierId: order.supplierId, currency: order.currency },
        correlationId: ctx.correlationId,
      });
      return PurchaseOrderResponseDto.fromDomain(order);
    } catch (error) {
      handlePurchasingError(error);
    }
  }

  @Get(":id/lines")
  @UseGuards(PermissionGuard)
  @RequirePermission("purchasing.orders.read")
  @ApiOperation({ summary: "List a purchase order's lines." })
  @ApiResponse({ status: HttpStatus.OK, type: [PurchaseOrderLineResponseDto] })
  async listOrderLines(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PurchaseOrderLineResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const lines = await this.listLines.execute({ tenantId: ctx.tenantId, companyId, purchaseOrderId: id });
      return lines.map(PurchaseOrderLineResponseDto.fromDomain);
    } catch (error) {
      handlePurchasingError(error);
    }
  }

  @Post(":id/lines")
  @UseGuards(PermissionGuard)
  @RequirePermission("purchasing.orders.manage")
  @ApiOperation({ summary: "Add a line to a DRAFT purchase order." })
  @ApiResponse({ status: HttpStatus.CREATED, type: PurchaseOrderLineResponseDto })
  async addOrderLine(
    @Param("id") id: string,
    @Body() dto: AddPurchaseOrderLineDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PurchaseOrderLineResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const line = await this.addLine.execute({ tenantId: ctx.tenantId, companyId, purchaseOrderId: id, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "purchasing.order_line.added",
        resource: "PurchaseOrderLine",
        resourceId: line.id,
        newValues: { purchaseOrderId: id, productId: line.productId, quantity: line.quantity, lineTotal: line.lineTotal },
        correlationId: ctx.correlationId,
      });
      return PurchaseOrderLineResponseDto.fromDomain(line);
    } catch (error) {
      handlePurchasingError(error);
    }
  }

  @Post(":id/confirm")
  @UseGuards(PermissionGuard)
  @RequirePermission("purchasing.orders.approve")
  @ApiOperation({
    summary:
      "Approve a DRAFT order, moving it to CONFIRMED. Gated by a distinct approve permission from purchasing.orders.manage, so drafting and approving can be different roles (docs/ROADMAP.md §9 segregation of duties).",
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: PurchaseOrderResponseDto })
  async confirm(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PurchaseOrderResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const order = await this.confirmOrder.execute({ tenantId: ctx.tenantId, companyId, purchaseOrderId: id });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "purchasing.order.confirmed",
        resource: "PurchaseOrder",
        resourceId: order.id,
        newValues: { status: order.status },
        correlationId: ctx.correlationId,
      });
      return PurchaseOrderResponseDto.fromDomain(order);
    } catch (error) {
      handlePurchasingError(error);
    }
  }

  @Post(":id/close")
  @UseGuards(PermissionGuard)
  @RequirePermission("purchasing.orders.manage")
  @ApiOperation({ summary: "Close a CONFIRMED order — does not require every line to be fully received." })
  @ApiResponse({ status: HttpStatus.CREATED, type: PurchaseOrderResponseDto })
  async close(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PurchaseOrderResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const order = await this.closeOrder.execute({ tenantId: ctx.tenantId, companyId, purchaseOrderId: id });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "purchasing.order.closed",
        resource: "PurchaseOrder",
        resourceId: order.id,
        newValues: { status: order.status },
        correlationId: ctx.correlationId,
      });
      return PurchaseOrderResponseDto.fromDomain(order);
    } catch (error) {
      handlePurchasingError(error);
    }
  }

  @Post(":id/cancel")
  @UseGuards(PermissionGuard)
  @RequirePermission("purchasing.orders.manage")
  @ApiOperation({ summary: "Cancel a DRAFT or CONFIRMED order — rejected if any receipt already exists for it." })
  @ApiResponse({ status: HttpStatus.CREATED, type: PurchaseOrderResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "PURCHASE_ORDER_HAS_RECEIPTS" })
  async cancel(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PurchaseOrderResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const order = await this.cancelOrder.execute({ tenantId: ctx.tenantId, companyId, purchaseOrderId: id });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "purchasing.order.cancelled",
        resource: "PurchaseOrder",
        resourceId: order.id,
        newValues: { status: order.status },
        correlationId: ctx.correlationId,
      });
      return PurchaseOrderResponseDto.fromDomain(order);
    } catch (error) {
      handlePurchasingError(error);
    }
  }
}
