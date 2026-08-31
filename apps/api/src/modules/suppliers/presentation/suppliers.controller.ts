import { Body, Controller, Get, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateSupplierUseCase } from "../application/use-cases/create-supplier.use-case";
import { UpdateSupplierUseCase } from "../application/use-cases/update-supplier.use-case";
import { ListSuppliersUseCase } from "../application/use-cases/list-suppliers.use-case";
import { SetSupplierStatusUseCase } from "../application/use-cases/set-supplier-status.use-case";
import {
  CreateSupplierDto,
  SetSupplierStatusDto,
  SupplierResponseDto,
  UpdateSupplierDto,
} from "./dto/supplier.dto";
import { handleSupplierError } from "./suppliers-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Suppliers")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/suppliers")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class SuppliersController {
  constructor(
    private readonly createSupplier: CreateSupplierUseCase,
    private readonly updateSupplier: UpdateSupplierUseCase,
    private readonly listSuppliers: ListSuppliersUseCase,
    private readonly setStatus: SetSupplierStatusUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("suppliers.read")
  @ApiOperation({ summary: "List the active company's suppliers." })
  @ApiResponse({ status: HttpStatus.OK, type: [SupplierResponseDto] })
  async list(@CurrentTenantContext() ctx: TenantExecutionContext): Promise<SupplierResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const suppliers = await this.listSuppliers.execute(ctx.tenantId, companyId);
      return suppliers.map(SupplierResponseDto.fromDomain);
    } catch (error) {
      handleSupplierError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("suppliers.manage")
  @ApiOperation({ summary: "Create a supplier for the active company." })
  @ApiResponse({ status: HttpStatus.CREATED, type: SupplierResponseDto })
  async create(
    @Body() dto: CreateSupplierDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SupplierResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const supplier = await this.createSupplier.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "suppliers.supplier.created",
        resource: "Supplier",
        resourceId: supplier.id,
        newValues: { code: supplier.code, name: supplier.name },
        correlationId: ctx.correlationId,
      });
      return SupplierResponseDto.fromDomain(supplier);
    } catch (error) {
      handleSupplierError(error);
    }
  }

  @Put(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("suppliers.manage")
  @ApiOperation({ summary: "Update a supplier." })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierResponseDto })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SupplierResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const supplier = await this.updateSupplier.execute({ tenantId: ctx.tenantId, companyId, id, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "suppliers.supplier.updated",
        resource: "Supplier",
        resourceId: supplier.id,
        newValues: { name: supplier.name },
        correlationId: ctx.correlationId,
      });
      return SupplierResponseDto.fromDomain(supplier);
    } catch (error) {
      handleSupplierError(error);
    }
  }

  @Put(":id/status")
  @UseGuards(PermissionGuard)
  @RequirePermission("suppliers.manage")
  @ApiOperation({ summary: "Activate or deactivate a supplier." })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierResponseDto })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: SetSupplierStatusDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SupplierResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const supplier = await this.setStatus.execute({ tenantId: ctx.tenantId, companyId, id, status: dto.status });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "suppliers.supplier.status_changed",
        resource: "Supplier",
        resourceId: supplier.id,
        newValues: { status: supplier.status },
        correlationId: ctx.correlationId,
      });
      return SupplierResponseDto.fromDomain(supplier);
    } catch (error) {
      handleSupplierError(error);
    }
  }
}
