import { Body, Controller, Get, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { RecordReceiptUseCase } from "../application/use-cases/record-receipt.use-case";
import { RecordIssueUseCase } from "../application/use-cases/record-issue.use-case";
import { AdjustInventoryUseCase } from "../application/use-cases/adjust-inventory.use-case";
import { ListInventoryBalancesUseCase } from "../application/use-cases/list-inventory-balances.use-case";
import { ListInventoryMovementsUseCase } from "../application/use-cases/list-inventory-movements.use-case";
import { CreateReservationUseCase } from "../application/use-cases/create-reservation.use-case";
import { ReleaseReservationUseCase } from "../application/use-cases/release-reservation.use-case";
import { ListInventoryReservationsUseCase } from "../application/use-cases/list-inventory-reservations.use-case";
import { CreateTransferUseCase } from "../application/use-cases/create-transfer.use-case";
import { CompleteTransferUseCase } from "../application/use-cases/complete-transfer.use-case";
import { CancelTransferUseCase } from "../application/use-cases/cancel-transfer.use-case";
import { ListInventoryTransfersUseCase } from "../application/use-cases/list-inventory-transfers.use-case";
import { InventoryBalanceResponseDto, ListInventoryBalancesQueryDto } from "./dto/inventory-balance.dto";
import {
  AdjustInventoryDto,
  InventoryMovementResponseDto,
  ListInventoryMovementsQueryDto,
  RecordIssueDto,
  RecordReceiptDto,
} from "./dto/inventory-movement.dto";
import {
  CreateReservationDto,
  InventoryReservationResponseDto,
  ListInventoryReservationsQueryDto,
} from "./dto/inventory-reservation.dto";
import { CreateTransferDto, InventoryTransferResponseDto, ListInventoryTransfersQueryDto } from "./dto/inventory-transfer.dto";
import { handleInventoryError } from "./inventory-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Inventory")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/inventory")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class InventoryController {
  constructor(
    private readonly recordReceipt: RecordReceiptUseCase,
    private readonly recordIssue: RecordIssueUseCase,
    private readonly adjustInventory: AdjustInventoryUseCase,
    private readonly listBalances: ListInventoryBalancesUseCase,
    private readonly listMovements: ListInventoryMovementsUseCase,
    private readonly createReservation: CreateReservationUseCase,
    private readonly releaseReservation: ReleaseReservationUseCase,
    private readonly listReservations: ListInventoryReservationsUseCase,
    private readonly createTransfer: CreateTransferUseCase,
    private readonly completeTransfer: CompleteTransferUseCase,
    private readonly cancelTransfer: CancelTransferUseCase,
    private readonly listTransfers: ListInventoryTransfersUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get("balances")
  @UseGuards(PermissionGuard)
  @RequirePermission("inventory.balances.read")
  @ApiOperation({ summary: "List on-hand/reserved/available balances for the active company." })
  @ApiResponse({ status: HttpStatus.OK, type: [InventoryBalanceResponseDto] })
  async listBalancesHandler(
    @Query() query: ListInventoryBalancesQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<InventoryBalanceResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const balances = await this.listBalances.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: {
          warehouseId: query.warehouseId,
          productId: query.productId,
          productVariantId: query.productVariantId,
        },
      });
      return balances.map(InventoryBalanceResponseDto.fromDomain);
    } catch (error) {
      handleInventoryError(error);
    }
  }

  @Get("movements")
  @UseGuards(PermissionGuard)
  @RequirePermission("inventory.movements.read")
  @ApiOperation({ summary: "List the append-only inventory ledger for the active company." })
  @ApiResponse({ status: HttpStatus.OK, type: [InventoryMovementResponseDto] })
  async listMovementsHandler(
    @Query() query: ListInventoryMovementsQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<InventoryMovementResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const movements = await this.listMovements.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: {
          warehouseId: query.warehouseId,
          productId: query.productId,
          productVariantId: query.productVariantId,
          referenceType: query.referenceType,
          referenceId: query.referenceId,
          limit: query.limit ?? 100,
        },
      });
      return movements.map(InventoryMovementResponseDto.fromDomain);
    } catch (error) {
      handleInventoryError(error);
    }
  }

  @Post("movements/receipt")
  @UseGuards(PermissionGuard)
  @RequirePermission("inventory.movements.manage")
  @ApiOperation({ summary: "Post a receipt: stock arriving into a warehouse with no formal transfer." })
  @ApiResponse({ status: HttpStatus.CREATED, type: InventoryMovementResponseDto })
  async receipt(
    @Body() dto: RecordReceiptDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<InventoryMovementResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const { movement, balance } = await this.recordReceipt.execute({
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
        action: "inventory.movement.receipt",
        resource: "InventoryMovement",
        resourceId: movement.id,
        newValues: { warehouseId: movement.warehouseId, productId: movement.productId, quantity: movement.quantity, onHand: balance.onHandQuantity },
        correlationId: ctx.correlationId,
      });
      return InventoryMovementResponseDto.fromDomain(movement);
    } catch (error) {
      handleInventoryError(error);
    }
  }

  @Post("movements/issue")
  @UseGuards(PermissionGuard)
  @RequirePermission("inventory.movements.manage")
  @ApiOperation({ summary: "Post an issue: stock leaving a warehouse with no formal transfer." })
  @ApiResponse({ status: HttpStatus.CREATED, type: InventoryMovementResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "INSUFFICIENT_INVENTORY" })
  async issue(
    @Body() dto: RecordIssueDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<InventoryMovementResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const { movement, balance } = await this.recordIssue.execute({
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
        action: "inventory.movement.issue",
        resource: "InventoryMovement",
        resourceId: movement.id,
        newValues: { warehouseId: movement.warehouseId, productId: movement.productId, quantity: movement.quantity, onHand: balance.onHandQuantity },
        correlationId: ctx.correlationId,
      });
      return InventoryMovementResponseDto.fromDomain(movement);
    } catch (error) {
      handleInventoryError(error);
    }
  }

  @Post("movements/adjustment")
  @UseGuards(PermissionGuard)
  @RequirePermission("inventory.movements.manage")
  @ApiOperation({ summary: "Post a manual correction to on-hand stock. Always requires a reason." })
  @ApiResponse({ status: HttpStatus.CREATED, type: InventoryMovementResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "INSUFFICIENT_INVENTORY" })
  async adjustment(
    @Body() dto: AdjustInventoryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<InventoryMovementResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const { movement, balance } = await this.adjustInventory.execute({
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
        action: "inventory.movement.adjustment",
        resource: "InventoryMovement",
        resourceId: movement.id,
        newValues: {
          warehouseId: movement.warehouseId,
          productId: movement.productId,
          quantity: movement.quantity,
          reason: movement.reason,
          onHand: balance.onHandQuantity,
        },
        correlationId: ctx.correlationId,
      });
      return InventoryMovementResponseDto.fromDomain(movement);
    } catch (error) {
      handleInventoryError(error);
    }
  }

  @Get("reservations")
  @UseGuards(PermissionGuard)
  @RequirePermission("inventory.reservations.read")
  @ApiOperation({ summary: "List inventory reservations for the active company." })
  @ApiResponse({ status: HttpStatus.OK, type: [InventoryReservationResponseDto] })
  async listReservationsHandler(
    @Query() query: ListInventoryReservationsQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<InventoryReservationResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const reservations = await this.listReservations.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: {
          warehouseId: query.warehouseId,
          productId: query.productId,
          status: query.status,
          limit: query.limit ?? 100,
        },
      });
      return reservations.map(InventoryReservationResponseDto.fromDomain);
    } catch (error) {
      handleInventoryError(error);
    }
  }

  @Post("reservations")
  @UseGuards(PermissionGuard)
  @RequirePermission("inventory.reservations.manage")
  @ApiOperation({ summary: "Earmark stock without moving it physically." })
  @ApiResponse({ status: HttpStatus.CREATED, type: InventoryReservationResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "INSUFFICIENT_INVENTORY" })
  async createReservationHandler(
    @Body() dto: CreateReservationDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<InventoryReservationResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const { reservation } = await this.createReservation.execute({
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
        action: "inventory.reservation.created",
        resource: "InventoryReservation",
        resourceId: reservation.id,
        newValues: { warehouseId: reservation.warehouseId, productId: reservation.productId, quantity: reservation.quantity },
        correlationId: ctx.correlationId,
      });
      return InventoryReservationResponseDto.fromDomain(reservation);
    } catch (error) {
      handleInventoryError(error);
    }
  }

  @Post("reservations/:id/release")
  @UseGuards(PermissionGuard)
  @RequirePermission("inventory.reservations.manage")
  @ApiOperation({ summary: "Release a reservation's entire quantity back into available stock." })
  @ApiResponse({ status: HttpStatus.CREATED, type: InventoryReservationResponseDto })
  async releaseReservationHandler(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<InventoryReservationResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const { reservation } = await this.releaseReservation.execute({
        tenantId: ctx.tenantId,
        companyId,
        actorUserId: ctx.actor.userId,
        correlationId: ctx.correlationId,
        reservationId: id,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "inventory.reservation.released",
        resource: "InventoryReservation",
        resourceId: reservation.id,
        newValues: { status: reservation.status },
        correlationId: ctx.correlationId,
      });
      return InventoryReservationResponseDto.fromDomain(reservation);
    } catch (error) {
      handleInventoryError(error);
    }
  }

  @Get("transfers")
  @UseGuards(PermissionGuard)
  @RequirePermission("inventory.transfers.read")
  @ApiOperation({ summary: "List inventory transfers for the active company." })
  @ApiResponse({ status: HttpStatus.OK, type: [InventoryTransferResponseDto] })
  async listTransfersHandler(
    @Query() query: ListInventoryTransfersQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<InventoryTransferResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const transfers = await this.listTransfers.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: {
          warehouseId: query.warehouseId,
          productId: query.productId,
          status: query.status,
          limit: query.limit ?? 100,
        },
      });
      return transfers.map(InventoryTransferResponseDto.fromDomain);
    } catch (error) {
      handleInventoryError(error);
    }
  }

  @Post("transfers")
  @UseGuards(PermissionGuard)
  @RequirePermission("inventory.transfers.manage")
  @ApiOperation({ summary: "Move stock between two warehouses of the active company. Posts a TRANSFER_OUT at the source immediately." })
  @ApiResponse({ status: HttpStatus.CREATED, type: InventoryTransferResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "INSUFFICIENT_INVENTORY" })
  async createTransferHandler(
    @Body() dto: CreateTransferDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<InventoryTransferResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const { transfer } = await this.createTransfer.execute({
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
        action: "inventory.transfer.created",
        resource: "InventoryTransfer",
        resourceId: transfer.id,
        newValues: {
          productId: transfer.productId,
          sourceWarehouseId: transfer.sourceWarehouseId,
          destinationWarehouseId: transfer.destinationWarehouseId,
          quantity: transfer.quantity,
        },
        correlationId: ctx.correlationId,
      });
      return InventoryTransferResponseDto.fromDomain(transfer);
    } catch (error) {
      handleInventoryError(error);
    }
  }

  @Post("transfers/:id/complete")
  @UseGuards(PermissionGuard)
  @RequirePermission("inventory.transfers.manage")
  @ApiOperation({ summary: "Mark an IN_TRANSIT transfer as arrived: posts a TRANSFER_IN at the destination." })
  @ApiResponse({ status: HttpStatus.CREATED, type: InventoryTransferResponseDto })
  async completeTransferHandler(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<InventoryTransferResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const { transfer } = await this.completeTransfer.execute({
        tenantId: ctx.tenantId,
        companyId,
        actorUserId: ctx.actor.userId,
        correlationId: ctx.correlationId,
        transferId: id,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "inventory.transfer.completed",
        resource: "InventoryTransfer",
        resourceId: transfer.id,
        newValues: { status: transfer.status },
        correlationId: ctx.correlationId,
      });
      return InventoryTransferResponseDto.fromDomain(transfer);
    } catch (error) {
      handleInventoryError(error);
    }
  }

  @Post("transfers/:id/cancel")
  @UseGuards(PermissionGuard)
  @RequirePermission("inventory.transfers.manage")
  @ApiOperation({ summary: "Cancel an IN_TRANSIT transfer: posts a TRANSFER_CANCELLED at the source, reversing the original TRANSFER_OUT." })
  @ApiResponse({ status: HttpStatus.CREATED, type: InventoryTransferResponseDto })
  async cancelTransferHandler(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<InventoryTransferResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const { transfer } = await this.cancelTransfer.execute({
        tenantId: ctx.tenantId,
        companyId,
        actorUserId: ctx.actor.userId,
        correlationId: ctx.correlationId,
        transferId: id,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "inventory.transfer.cancelled",
        resource: "InventoryTransfer",
        resourceId: transfer.id,
        newValues: { status: transfer.status },
        correlationId: ctx.correlationId,
      });
      return InventoryTransferResponseDto.fromDomain(transfer);
    } catch (error) {
      handleInventoryError(error);
    }
  }
}
