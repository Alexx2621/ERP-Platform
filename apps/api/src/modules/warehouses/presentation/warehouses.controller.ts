import { Body, Controller, Get, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateWarehouseUseCase } from "../application/use-cases/create-warehouse.use-case";
import { UpdateWarehouseUseCase } from "../application/use-cases/update-warehouse.use-case";
import { ListWarehousesUseCase } from "../application/use-cases/list-warehouses.use-case";
import { SetWarehouseStatusUseCase } from "../application/use-cases/set-warehouse-status.use-case";
import {
  CreateWarehouseDto,
  SetWarehouseStatusDto,
  UpdateWarehouseDto,
  WarehouseResponseDto,
} from "./dto/warehouse.dto";
import { handleWarehouseError } from "./warehouses-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Warehouses")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/warehouses")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class WarehousesController {
  constructor(
    private readonly createWarehouse: CreateWarehouseUseCase,
    private readonly updateWarehouse: UpdateWarehouseUseCase,
    private readonly listWarehouses: ListWarehousesUseCase,
    private readonly setStatus: SetWarehouseStatusUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("warehouses.read")
  @ApiOperation({ summary: "List the active company's warehouses." })
  @ApiResponse({ status: HttpStatus.OK, type: [WarehouseResponseDto] })
  async list(@CurrentTenantContext() ctx: TenantExecutionContext): Promise<WarehouseResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const warehouses = await this.listWarehouses.execute(ctx.tenantId, companyId);
      return warehouses.map(WarehouseResponseDto.fromDomain);
    } catch (error) {
      handleWarehouseError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("warehouses.manage")
  @ApiOperation({ summary: "Create a warehouse for the active company." })
  @ApiResponse({ status: HttpStatus.CREATED, type: WarehouseResponseDto })
  async create(
    @Body() dto: CreateWarehouseDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<WarehouseResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const warehouse = await this.createWarehouse.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "warehouses.warehouse.created",
        resource: "Warehouse",
        resourceId: warehouse.id,
        newValues: { code: warehouse.code, name: warehouse.name },
        correlationId: ctx.correlationId,
      });
      return WarehouseResponseDto.fromDomain(warehouse);
    } catch (error) {
      handleWarehouseError(error);
    }
  }

  @Put(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("warehouses.manage")
  @ApiOperation({ summary: "Update a warehouse." })
  @ApiResponse({ status: HttpStatus.OK, type: WarehouseResponseDto })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateWarehouseDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<WarehouseResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const warehouse = await this.updateWarehouse.execute({ tenantId: ctx.tenantId, companyId, id, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "warehouses.warehouse.updated",
        resource: "Warehouse",
        resourceId: warehouse.id,
        newValues: { name: warehouse.name },
        correlationId: ctx.correlationId,
      });
      return WarehouseResponseDto.fromDomain(warehouse);
    } catch (error) {
      handleWarehouseError(error);
    }
  }

  @Put(":id/status")
  @UseGuards(PermissionGuard)
  @RequirePermission("warehouses.manage")
  @ApiOperation({ summary: "Activate or deactivate a warehouse." })
  @ApiResponse({ status: HttpStatus.OK, type: WarehouseResponseDto })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: SetWarehouseStatusDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<WarehouseResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const warehouse = await this.setStatus.execute({ tenantId: ctx.tenantId, companyId, id, status: dto.status });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "warehouses.warehouse.status_changed",
        resource: "Warehouse",
        resourceId: warehouse.id,
        newValues: { status: warehouse.status },
        correlationId: ctx.correlationId,
      });
      return WarehouseResponseDto.fromDomain(warehouse);
    } catch (error) {
      handleWarehouseError(error);
    }
  }
}
