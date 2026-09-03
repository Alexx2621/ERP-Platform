import { Body, Controller, Get, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateProductionOrderUseCase } from "../application/use-cases/create-production-order.use-case";
import { ConfirmProductionOrderUseCase } from "../application/use-cases/confirm-production-order.use-case";
import { CloseProductionOrderUseCase } from "../application/use-cases/close-production-order.use-case";
import { CancelProductionOrderUseCase } from "../application/use-cases/cancel-production-order.use-case";
import { ListProductionOrdersUseCase } from "../application/use-cases/list-production-orders.use-case";
import { GetProductionOrderUseCase } from "../application/use-cases/get-production-order.use-case";
import { ListProductionOrderMaterialsUseCase } from "../application/use-cases/list-production-order-materials.use-case";
import { IssueProductionOrderMaterialUseCase } from "../application/use-cases/issue-production-order-material.use-case";
import { ReturnProductionOrderMaterialUseCase } from "../application/use-cases/return-production-order-material.use-case";
import { RecordFinishedGoodsUseCase } from "../application/use-cases/record-finished-goods.use-case";
import { ListProductionOrderFinishedGoodsReceiptsUseCase } from "../application/use-cases/list-production-order-finished-goods-receipts.use-case";
import { AddProductionOrderOperationUseCase } from "../application/use-cases/add-production-order-operation.use-case";
import { CompleteProductionOrderOperationUseCase } from "../application/use-cases/complete-production-order-operation.use-case";
import { ListProductionOrderOperationsUseCase } from "../application/use-cases/list-production-order-operations.use-case";
import {
  CreateProductionOrderDto,
  IssueProductionOrderMaterialDto,
  ListProductionOrdersQueryDto,
  ProductionOrderFinishedGoodsReceiptResponseDto,
  ProductionOrderMaterialMovementResponseDto,
  ProductionOrderMaterialResponseDto,
  ProductionOrderResponseDto,
  RecordFinishedGoodsDto,
  ReturnProductionOrderMaterialDto,
} from "./dto/production-order.dto";
import {
  AddProductionOrderOperationDto,
  ProductionOrderOperationResponseDto,
} from "./dto/production-order-operation.dto";
import { handleManufacturingError } from "./manufacturing-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Manufacturing")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/manufacturing/orders")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class ProductionOrdersController {
  constructor(
    private readonly createOrder: CreateProductionOrderUseCase,
    private readonly confirmOrder: ConfirmProductionOrderUseCase,
    private readonly closeOrder: CloseProductionOrderUseCase,
    private readonly cancelOrder: CancelProductionOrderUseCase,
    private readonly listOrders: ListProductionOrdersUseCase,
    private readonly getOrder: GetProductionOrderUseCase,
    private readonly listMaterials: ListProductionOrderMaterialsUseCase,
    private readonly issueMaterial: IssueProductionOrderMaterialUseCase,
    private readonly returnMaterial: ReturnProductionOrderMaterialUseCase,
    private readonly recordFinishedGoods: RecordFinishedGoodsUseCase,
    private readonly listFinishedGoodsReceiptsUseCase: ListProductionOrderFinishedGoodsReceiptsUseCase,
    private readonly addOperation: AddProductionOrderOperationUseCase,
    private readonly completeOperation: CompleteProductionOrderOperationUseCase,
    private readonly listOperations: ListProductionOrderOperationsUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.orders.read")
  @ApiOperation({ summary: "List production orders for the active company." })
  @ApiResponse({ status: HttpStatus.OK, type: [ProductionOrderResponseDto] })
  async list(
    @Query() query: ListProductionOrdersQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductionOrderResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const orders = await this.listOrders.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { status: query.status, billOfMaterialId: query.billOfMaterialId, limit: query.limit ?? 50 },
      });
      // List responses show a computed completed quantity too, resolved per-order via GetProductionOrderUseCase — small companies/order volumes make this acceptable (same N+1 trade-off CancelProductionOrderUseCase already accepts for its own activity check).
      const withCompleted = await Promise.all(
        orders.map(async (order) => {
          const result = await this.getOrder.execute({ tenantId: ctx.tenantId, companyId, productionOrderId: order.id });
          return ProductionOrderResponseDto.fromDomain(result.order, result.quantityCompleted);
        }),
      );
      return withCompleted;
    } catch (error) {
      handleManufacturingError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.orders.manage")
  @ApiOperation({ summary: "Create a DRAFT production order, snapshotting its BOM's components as material requirements." })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProductionOrderResponseDto })
  async create(
    @Body() dto: CreateProductionOrderDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductionOrderResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const order = await this.createOrder.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "manufacturing.order.created",
        resource: "ProductionOrder",
        resourceId: order.id,
        newValues: { billOfMaterialId: order.billOfMaterialId, quantityPlanned: order.quantityPlanned },
        correlationId: ctx.correlationId,
      });
      return ProductionOrderResponseDto.fromDomain(order, "0.0000");
    } catch (error) {
      handleManufacturingError(error);
    }
  }

  @Get(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.orders.read")
  @ApiOperation({ summary: "Get a production order by id, including its computed completed quantity." })
  @ApiResponse({ status: HttpStatus.OK, type: ProductionOrderResponseDto })
  async get(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductionOrderResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const result = await this.getOrder.execute({ tenantId: ctx.tenantId, companyId, productionOrderId: id });
      return ProductionOrderResponseDto.fromDomain(result.order, result.quantityCompleted);
    } catch (error) {
      handleManufacturingError(error);
    }
  }

  @Get(":id/materials")
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.orders.read")
  @ApiOperation({ summary: "List a production order's material requirements, with net issued quantity." })
  @ApiResponse({ status: HttpStatus.OK, type: [ProductionOrderMaterialResponseDto] })
  async listOrderMaterials(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductionOrderMaterialResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const summaries = await this.listMaterials.execute({ tenantId: ctx.tenantId, companyId, productionOrderId: id });
      return summaries.map(ProductionOrderMaterialResponseDto.fromSummary);
    } catch (error) {
      handleManufacturingError(error);
    }
  }

  @Post(":id/confirm")
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.orders.manage")
  @ApiOperation({ summary: "Confirm a DRAFT production order, moving it to CONFIRMED." })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProductionOrderResponseDto })
  async confirm(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductionOrderResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const order = await this.confirmOrder.execute({ tenantId: ctx.tenantId, companyId, productionOrderId: id });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "manufacturing.order.confirmed",
        resource: "ProductionOrder",
        resourceId: order.id,
        newValues: { status: order.status },
        correlationId: ctx.correlationId,
      });
      return ProductionOrderResponseDto.fromDomain(order, "0.0000");
    } catch (error) {
      handleManufacturingError(error);
    }
  }

  @Post(":id/close")
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.orders.manage")
  @ApiOperation({ summary: "Close a CONFIRMED order — does not require every material to be fully consumed or all finished goods received." })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProductionOrderResponseDto })
  async close(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductionOrderResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const order = await this.closeOrder.execute({ tenantId: ctx.tenantId, companyId, productionOrderId: id });
      const result = await this.getOrder.execute({ tenantId: ctx.tenantId, companyId, productionOrderId: id });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "manufacturing.order.closed",
        resource: "ProductionOrder",
        resourceId: order.id,
        newValues: { status: order.status },
        correlationId: ctx.correlationId,
      });
      return ProductionOrderResponseDto.fromDomain(order, result.quantityCompleted);
    } catch (error) {
      handleManufacturingError(error);
    }
  }

  @Post(":id/cancel")
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.orders.manage")
  @ApiOperation({ summary: "Cancel a DRAFT or CONFIRMED order — rejected if any material movement or finished-goods receipt already exists for it." })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProductionOrderResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "PRODUCTION_ORDER_HAS_ACTIVITY" })
  async cancel(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductionOrderResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const order = await this.cancelOrder.execute({ tenantId: ctx.tenantId, companyId, productionOrderId: id });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "manufacturing.order.cancelled",
        resource: "ProductionOrder",
        resourceId: order.id,
        newValues: { status: order.status },
        correlationId: ctx.correlationId,
      });
      return ProductionOrderResponseDto.fromDomain(order, "0.0000");
    } catch (error) {
      handleManufacturingError(error);
    }
  }

  @Post(":id/materials/issue")
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.orders.manage")
  @ApiOperation({ summary: "Issue (consume) a real quantity of a material from the order's warehouse — genuinely partial across multiple calls." })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProductionOrderMaterialMovementResponseDto })
  async issue(
    @Param("id") id: string,
    @Body() dto: IssueProductionOrderMaterialDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductionOrderMaterialMovementResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const movement = await this.issueMaterial.execute({
        tenantId: ctx.tenantId,
        companyId,
        actorUserId: ctx.actor.userId,
        correlationId: ctx.correlationId,
        productionOrderId: id,
        productionOrderMaterialId: dto.productionOrderMaterialId,
        quantity: dto.quantity,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "manufacturing.material.issued",
        resource: "ProductionOrderMaterialMovement",
        resourceId: movement.id,
        newValues: { productionOrderId: id, productionOrderMaterialId: dto.productionOrderMaterialId, quantity: movement.quantity },
        correlationId: ctx.correlationId,
      });
      return ProductionOrderMaterialMovementResponseDto.fromDomain(movement);
    } catch (error) {
      handleManufacturingError(error);
    }
  }

  @Post(":id/materials/return")
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.orders.manage")
  @ApiOperation({ summary: "Return unused, previously-issued material back to stock." })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProductionOrderMaterialMovementResponseDto })
  async returnMaterialToStock(
    @Param("id") id: string,
    @Body() dto: ReturnProductionOrderMaterialDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductionOrderMaterialMovementResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const movement = await this.returnMaterial.execute({
        tenantId: ctx.tenantId,
        companyId,
        actorUserId: ctx.actor.userId,
        correlationId: ctx.correlationId,
        productionOrderId: id,
        productionOrderMaterialId: dto.productionOrderMaterialId,
        quantity: dto.quantity,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "manufacturing.material.returned",
        resource: "ProductionOrderMaterialMovement",
        resourceId: movement.id,
        newValues: { productionOrderId: id, productionOrderMaterialId: dto.productionOrderMaterialId, quantity: movement.quantity },
        correlationId: ctx.correlationId,
      });
      return ProductionOrderMaterialMovementResponseDto.fromDomain(movement);
    } catch (error) {
      handleManufacturingError(error);
    }
  }

  @Get(":id/finished-goods-receipts")
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.orders.read")
  @ApiOperation({ summary: "List a production order's finished-goods receipts." })
  @ApiResponse({ status: HttpStatus.OK, type: [ProductionOrderFinishedGoodsReceiptResponseDto] })
  async listFinishedGoodsReceipts(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductionOrderFinishedGoodsReceiptResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const receipts = await this.listFinishedGoodsReceiptsUseCase.execute({
        tenantId: ctx.tenantId,
        companyId,
        productionOrderId: id,
      });
      return receipts.map(ProductionOrderFinishedGoodsReceiptResponseDto.fromDomain);
    } catch (error) {
      handleManufacturingError(error);
    }
  }

  @Post(":id/finished-goods-receipts")
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.orders.manage")
  @ApiOperation({ summary: "Record a real, genuinely partial receipt of finished goods into the order's warehouse." })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProductionOrderFinishedGoodsReceiptResponseDto })
  async recordFinishedGoodsReceipt(
    @Param("id") id: string,
    @Body() dto: RecordFinishedGoodsDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductionOrderFinishedGoodsReceiptResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const receipt = await this.recordFinishedGoods.execute({
        tenantId: ctx.tenantId,
        companyId,
        actorUserId: ctx.actor.userId,
        correlationId: ctx.correlationId,
        productionOrderId: id,
        quantity: dto.quantity,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "manufacturing.finished_goods.received",
        resource: "ProductionOrderFinishedGoodsReceipt",
        resourceId: receipt.id,
        newValues: { productionOrderId: id, quantity: receipt.quantity },
        correlationId: ctx.correlationId,
      });
      return ProductionOrderFinishedGoodsReceiptResponseDto.fromDomain(receipt);
    } catch (error) {
      handleManufacturingError(error);
    }
  }

  @Get(":id/operations")
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.orders.read")
  @ApiOperation({ summary: "List a production order's operations." })
  @ApiResponse({ status: HttpStatus.OK, type: [ProductionOrderOperationResponseDto] })
  async listOrderOperations(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductionOrderOperationResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const operations = await this.listOperations.execute({ tenantId: ctx.tenantId, companyId, productionOrderId: id });
      return operations.map(ProductionOrderOperationResponseDto.fromDomain);
    } catch (error) {
      handleManufacturingError(error);
    }
  }

  @Post(":id/operations")
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.orders.manage")
  @ApiOperation({ summary: "Add a named process step to a DRAFT or CONFIRMED order, always appended at the end." })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProductionOrderOperationResponseDto })
  async addOrderOperation(
    @Param("id") id: string,
    @Body() dto: AddProductionOrderOperationDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductionOrderOperationResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const operation = await this.addOperation.execute({
        tenantId: ctx.tenantId,
        companyId,
        productionOrderId: id,
        name: dto.name,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "manufacturing.operation.added",
        resource: "ProductionOrderOperation",
        resourceId: operation.id,
        newValues: { productionOrderId: id, name: operation.name },
        correlationId: ctx.correlationId,
      });
      return ProductionOrderOperationResponseDto.fromDomain(operation);
    } catch (error) {
      handleManufacturingError(error);
    }
  }

  @Post(":id/operations/:operationId/complete")
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.orders.manage")
  @ApiOperation({ summary: "Mark an operation completed — one-way, no un-completing." })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProductionOrderOperationResponseDto })
  async completeOrderOperation(
    @Param("id") id: string,
    @Param("operationId") operationId: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductionOrderOperationResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const operation = await this.completeOperation.execute({
        tenantId: ctx.tenantId,
        companyId,
        productionOrderId: id,
        operationId,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "manufacturing.operation.completed",
        resource: "ProductionOrderOperation",
        resourceId: operation.id,
        newValues: { productionOrderId: id },
        correlationId: ctx.correlationId,
      });
      return ProductionOrderOperationResponseDto.fromDomain(operation);
    } catch (error) {
      handleManufacturingError(error);
    }
  }
}
