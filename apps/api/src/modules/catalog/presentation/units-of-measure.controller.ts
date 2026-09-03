import { Body, Controller, Get, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { AppEnablementGuard, RequireApp } from "../../../core/app-registry";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateUnitOfMeasureUseCase } from "../application/use-cases/create-unit-of-measure.use-case";
import { UpdateUnitOfMeasureUseCase } from "../application/use-cases/update-unit-of-measure.use-case";
import { ListUnitsOfMeasureUseCase } from "../application/use-cases/list-units-of-measure.use-case";
import { SetUnitOfMeasureStatusUseCase } from "../application/use-cases/set-unit-of-measure-status.use-case";
import {
  CreateUnitOfMeasureDto,
  SetUnitOfMeasureStatusDto,
  UnitOfMeasureResponseDto,
  UpdateUnitOfMeasureDto,
} from "./dto/unit-of-measure.dto";
import { handleCatalogError } from "./catalog-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Catalog")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/catalog/units-of-measure")
@UseGuards(SessionAuthGuard, TenantContextGuard, AppEnablementGuard)
@RequireApp("catalog")
export class UnitsOfMeasureController {
  constructor(
    private readonly createUnit: CreateUnitOfMeasureUseCase,
    private readonly updateUnit: UpdateUnitOfMeasureUseCase,
    private readonly listUnits: ListUnitsOfMeasureUseCase,
    private readonly setStatus: SetUnitOfMeasureStatusUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.units-of-measure.read")
  @ApiOperation({ summary: "List the active company's units of measure." })
  @ApiResponse({ status: HttpStatus.OK, type: [UnitOfMeasureResponseDto] })
  async list(@CurrentTenantContext() ctx: TenantExecutionContext): Promise<UnitOfMeasureResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const units = await this.listUnits.execute(ctx.tenantId, companyId);
      return units.map(UnitOfMeasureResponseDto.fromDomain);
    } catch (error) {
      handleCatalogError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.units-of-measure.manage")
  @ApiOperation({ summary: "Create a unit of measure for the active company." })
  @ApiResponse({ status: HttpStatus.CREATED, type: UnitOfMeasureResponseDto })
  async create(
    @Body() dto: CreateUnitOfMeasureDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<UnitOfMeasureResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const unit = await this.createUnit.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "catalog.unit_of_measure.created",
        resource: "UnitOfMeasure",
        resourceId: unit.id,
        newValues: { code: unit.code, name: unit.name },
        correlationId: ctx.correlationId,
      });
      return UnitOfMeasureResponseDto.fromDomain(unit);
    } catch (error) {
      handleCatalogError(error);
    }
  }

  @Put(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.units-of-measure.manage")
  @ApiOperation({ summary: "Rename a unit of measure." })
  @ApiResponse({ status: HttpStatus.OK, type: UnitOfMeasureResponseDto })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateUnitOfMeasureDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<UnitOfMeasureResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const unit = await this.updateUnit.execute({ tenantId: ctx.tenantId, companyId, id, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "catalog.unit_of_measure.updated",
        resource: "UnitOfMeasure",
        resourceId: unit.id,
        newValues: { name: unit.name, symbol: unit.symbol },
        correlationId: ctx.correlationId,
      });
      return UnitOfMeasureResponseDto.fromDomain(unit);
    } catch (error) {
      handleCatalogError(error);
    }
  }

  @Put(":id/status")
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.units-of-measure.manage")
  @ApiOperation({ summary: "Activate or deactivate a unit of measure." })
  @ApiResponse({ status: HttpStatus.OK, type: UnitOfMeasureResponseDto })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: SetUnitOfMeasureStatusDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<UnitOfMeasureResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const unit = await this.setStatus.execute({ tenantId: ctx.tenantId, companyId, id, status: dto.status });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "catalog.unit_of_measure.status_changed",
        resource: "UnitOfMeasure",
        resourceId: unit.id,
        newValues: { status: unit.status },
        correlationId: ctx.correlationId,
      });
      return UnitOfMeasureResponseDto.fromDomain(unit);
    } catch (error) {
      handleCatalogError(error);
    }
  }
}
