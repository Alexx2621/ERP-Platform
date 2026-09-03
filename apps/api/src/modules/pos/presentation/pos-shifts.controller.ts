import { Body, Controller, Get, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { AppEnablementGuard, RequireApp } from "../../../core/app-registry";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { OpenShiftUseCase } from "../application/use-cases/open-shift.use-case";
import { CloseShiftUseCase } from "../application/use-cases/close-shift.use-case";
import { ListPosShiftsUseCase } from "../application/use-cases/list-pos-shifts.use-case";
import { GetPosShiftUseCase } from "../application/use-cases/get-pos-shift.use-case";
import { RecordCashMovementUseCase } from "../application/use-cases/record-cash-movement.use-case";
import { ListCashMovementsUseCase } from "../application/use-cases/list-cash-movements.use-case";
import { CloseShiftDto, ListPosShiftsQueryDto, OpenShiftDto, PosShiftResponseDto } from "./dto/pos-shift.dto";
import { PosCashMovementResponseDto, RecordCashMovementDto } from "./dto/pos-cash-movement.dto";
import { handlePosError } from "./pos-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("POS")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/pos/shifts")
@UseGuards(SessionAuthGuard, TenantContextGuard, AppEnablementGuard)
@RequireApp("pos")
export class PosShiftsController {
  constructor(
    private readonly openShift: OpenShiftUseCase,
    private readonly closeShift: CloseShiftUseCase,
    private readonly listShifts: ListPosShiftsUseCase,
    private readonly getShift: GetPosShiftUseCase,
    private readonly recordCashMovement: RecordCashMovementUseCase,
    private readonly listCashMovements: ListCashMovementsUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("pos.shifts.read")
  @ApiOperation({ summary: "List POS shifts for the active company." })
  @ApiResponse({ status: HttpStatus.OK, type: [PosShiftResponseDto] })
  async list(
    @Query() query: ListPosShiftsQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PosShiftResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const shifts = await this.listShifts.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { registerId: query.registerId, status: query.status, limit: query.limit ?? 50 },
      });
      return shifts.map(PosShiftResponseDto.fromDomain);
    } catch (error) {
      handlePosError(error);
    }
  }

  @Get(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("pos.shifts.read")
  @ApiOperation({ summary: "Get one POS shift." })
  @ApiResponse({ status: HttpStatus.OK, type: PosShiftResponseDto })
  async get(@Param("id") id: string, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<PosShiftResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const shift = await this.getShift.execute(ctx.tenantId, companyId, id);
      return PosShiftResponseDto.fromDomain(shift);
    } catch (error) {
      handlePosError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("pos.shifts.manage")
  @ApiOperation({ summary: "Open a shift on a register — a register may have at most one OPEN shift at a time." })
  @ApiResponse({ status: HttpStatus.CREATED, type: PosShiftResponseDto })
  async open(
    @Body() dto: OpenShiftDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PosShiftResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const shift = await this.openShift.execute({
        tenantId: ctx.tenantId,
        companyId,
        actorUserId: ctx.actor.userId,
        registerId: dto.registerId,
        openingCash: dto.openingCash,
        notes: dto.notes,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "pos.shift.opened",
        resource: "PosShift",
        resourceId: shift.id,
        newValues: { registerId: shift.registerId, openingCash: shift.openingCash },
        correlationId: ctx.correlationId,
      });
      return PosShiftResponseDto.fromDomain(shift);
    } catch (error) {
      handlePosError(error);
    }
  }

  @Post(":id/close")
  @UseGuards(PermissionGuard)
  @RequirePermission("pos.shifts.manage")
  @ApiOperation({ summary: "Close an OPEN shift, computing the expected cash and variance from this shift's own ledger." })
  @ApiResponse({ status: HttpStatus.CREATED, type: PosShiftResponseDto })
  async close(
    @Param("id") id: string,
    @Body() dto: CloseShiftDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PosShiftResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const shift = await this.closeShift.execute({
        tenantId: ctx.tenantId,
        companyId,
        actorUserId: ctx.actor.userId,
        shiftId: id,
        closingCashCounted: dto.closingCashCounted,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "pos.shift.closed",
        resource: "PosShift",
        resourceId: shift.id,
        newValues: {
          closingCashCounted: shift.closingCashCounted,
          closingCashExpected: shift.closingCashExpected,
          cashVariance: shift.cashVariance,
        },
        correlationId: ctx.correlationId,
      });
      return PosShiftResponseDto.fromDomain(shift);
    } catch (error) {
      handlePosError(error);
    }
  }

  @Get(":id/cash-movements")
  @UseGuards(PermissionGuard)
  @RequirePermission("pos.cash-movements.read")
  @ApiOperation({ summary: "List a shift's cash movements." })
  @ApiResponse({ status: HttpStatus.OK, type: [PosCashMovementResponseDto] })
  async listCashMovementsRoute(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PosCashMovementResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const movements = await this.listCashMovements.execute(ctx.tenantId, companyId, id);
      return movements.map(PosCashMovementResponseDto.fromDomain);
    } catch (error) {
      handlePosError(error);
    }
  }

  @Post(":id/cash-movements")
  @UseGuards(PermissionGuard)
  @RequirePermission("pos.cash-movements.manage")
  @ApiOperation({ summary: "Record a cash-in/cash-out movement against an OPEN shift." })
  @ApiResponse({ status: HttpStatus.CREATED, type: PosCashMovementResponseDto })
  async recordCashMovementRoute(
    @Param("id") id: string,
    @Body() dto: RecordCashMovementDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PosCashMovementResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const movement = await this.recordCashMovement.execute({
        tenantId: ctx.tenantId,
        companyId,
        actorUserId: ctx.actor.userId,
        shiftId: id,
        type: dto.type,
        amount: dto.amount,
        reason: dto.reason,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "pos.cash_movement.recorded",
        resource: "PosCashMovement",
        resourceId: movement.id,
        newValues: { shiftId: movement.shiftId, type: movement.type, amount: movement.amount, reason: movement.reason },
        correlationId: ctx.correlationId,
      });
      return PosCashMovementResponseDto.fromDomain(movement);
    } catch (error) {
      handlePosError(error);
    }
  }
}
