import { Body, Controller, Get, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateSalesOrderUseCase } from "../application/use-cases/create-sales-order.use-case";
import { AddSalesOrderLineUseCase } from "../application/use-cases/add-sales-order-line.use-case";
import { ListSalesOrdersUseCase } from "../application/use-cases/list-sales-orders.use-case";
import { ListSalesOrderLinesUseCase } from "../application/use-cases/list-sales-order-lines.use-case";
import { ConfirmSalesOrderUseCase } from "../application/use-cases/confirm-sales-order.use-case";
import { CancelSalesOrderUseCase } from "../application/use-cases/cancel-sales-order.use-case";
import { FulfillSalesOrderUseCase } from "../application/use-cases/fulfill-sales-order.use-case";
import { CreateSalesOrderDto, ListSalesOrdersQueryDto, SalesOrderResponseDto } from "./dto/sales-order.dto";
import { AddSalesOrderLineDto, SalesOrderLineResponseDto } from "./dto/sales-order-line.dto";
import { handleSalesError } from "./sales-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Sales")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/sales/orders")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class SalesOrdersController {
  constructor(
    private readonly createOrder: CreateSalesOrderUseCase,
    private readonly addLine: AddSalesOrderLineUseCase,
    private readonly listOrders: ListSalesOrdersUseCase,
    private readonly listLines: ListSalesOrderLinesUseCase,
    private readonly confirmOrder: ConfirmSalesOrderUseCase,
    private readonly cancelOrder: CancelSalesOrderUseCase,
    private readonly fulfillOrder: FulfillSalesOrderUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("sales.orders.read")
  @ApiOperation({ summary: "List sales orders for the active company." })
  @ApiResponse({ status: HttpStatus.OK, type: [SalesOrderResponseDto] })
  async list(
    @Query() query: ListSalesOrdersQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SalesOrderResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const orders = await this.listOrders.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { status: query.status, customerId: query.customerId, limit: query.limit ?? 50 },
      });
      return orders.map(SalesOrderResponseDto.fromDomain);
    } catch (error) {
      handleSalesError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("sales.orders.manage")
  @ApiOperation({ summary: "Create a DRAFT sales order directly (without a quote)." })
  @ApiResponse({ status: HttpStatus.CREATED, type: SalesOrderResponseDto })
  async create(
    @Body() dto: CreateSalesOrderDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SalesOrderResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const order = await this.createOrder.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "sales.order.created",
        resource: "SalesOrder",
        resourceId: order.id,
        newValues: { customerId: order.customerId, currency: order.currency },
        correlationId: ctx.correlationId,
      });
      return SalesOrderResponseDto.fromDomain(order);
    } catch (error) {
      handleSalesError(error);
    }
  }

  @Get(":id/lines")
  @UseGuards(PermissionGuard)
  @RequirePermission("sales.orders.read")
  @ApiOperation({ summary: "List a sales order's lines." })
  @ApiResponse({ status: HttpStatus.OK, type: [SalesOrderLineResponseDto] })
  async listOrderLines(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SalesOrderLineResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const lines = await this.listLines.execute({ tenantId: ctx.tenantId, companyId, salesOrderId: id });
      return lines.map(SalesOrderLineResponseDto.fromDomain);
    } catch (error) {
      handleSalesError(error);
    }
  }

  @Post(":id/lines")
  @UseGuards(PermissionGuard)
  @RequirePermission("sales.orders.manage")
  @ApiOperation({ summary: "Add a pricing-snapshot line to a DRAFT sales order." })
  @ApiResponse({ status: HttpStatus.CREATED, type: SalesOrderLineResponseDto })
  async addOrderLine(
    @Param("id") id: string,
    @Body() dto: AddSalesOrderLineDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SalesOrderLineResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const line = await this.addLine.execute({ tenantId: ctx.tenantId, companyId, salesOrderId: id, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "sales.order_line.added",
        resource: "SalesOrderLine",
        resourceId: line.id,
        newValues: { salesOrderId: id, productId: line.productId, quantity: line.quantity, lineTotal: line.lineTotal },
        correlationId: ctx.correlationId,
      });
      return SalesOrderLineResponseDto.fromDomain(line);
    } catch (error) {
      handleSalesError(error);
    }
  }

  @Post(":id/confirm")
  @UseGuards(PermissionGuard)
  @RequirePermission("sales.orders.manage")
  @ApiOperation({ summary: "Confirm a DRAFT order: reserves inventory for every line, compensating (releasing) already-reserved lines if any line fails." })
  @ApiResponse({ status: HttpStatus.CREATED, type: SalesOrderResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "INSUFFICIENT_INVENTORY_FOR_ORDER" })
  async confirm(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SalesOrderResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const order = await this.confirmOrder.execute({
        tenantId: ctx.tenantId,
        companyId,
        actorUserId: ctx.actor.userId,
        correlationId: ctx.correlationId,
        salesOrderId: id,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "sales.order.confirmed",
        resource: "SalesOrder",
        resourceId: order.id,
        newValues: { status: order.status },
        correlationId: ctx.correlationId,
      });
      return SalesOrderResponseDto.fromDomain(order);
    } catch (error) {
      handleSalesError(error);
    }
  }

  @Post(":id/cancel")
  @UseGuards(PermissionGuard)
  @RequirePermission("sales.orders.manage")
  @ApiOperation({ summary: "Cancel a DRAFT or CONFIRMED order, releasing any attached reservations." })
  @ApiResponse({ status: HttpStatus.CREATED, type: SalesOrderResponseDto })
  async cancel(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SalesOrderResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const order = await this.cancelOrder.execute({
        tenantId: ctx.tenantId,
        companyId,
        actorUserId: ctx.actor.userId,
        correlationId: ctx.correlationId,
        salesOrderId: id,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "sales.order.cancelled",
        resource: "SalesOrder",
        resourceId: order.id,
        newValues: { status: order.status },
        correlationId: ctx.correlationId,
      });
      return SalesOrderResponseDto.fromDomain(order);
    } catch (error) {
      handleSalesError(error);
    }
  }

  @Post(":id/fulfill")
  @UseGuards(PermissionGuard)
  @RequirePermission("sales.orders.manage")
  @ApiOperation({ summary: "Fulfill a CONFIRMED order: releases each line's reservation and issues real stock." })
  @ApiResponse({ status: HttpStatus.CREATED, type: SalesOrderResponseDto })
  async fulfill(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SalesOrderResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const order = await this.fulfillOrder.execute({
        tenantId: ctx.tenantId,
        companyId,
        actorUserId: ctx.actor.userId,
        correlationId: ctx.correlationId,
        salesOrderId: id,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "sales.order.fulfilled",
        resource: "SalesOrder",
        resourceId: order.id,
        newValues: { status: order.status },
        correlationId: ctx.correlationId,
      });
      return SalesOrderResponseDto.fromDomain(order);
    } catch (error) {
      handleSalesError(error);
    }
  }
}
