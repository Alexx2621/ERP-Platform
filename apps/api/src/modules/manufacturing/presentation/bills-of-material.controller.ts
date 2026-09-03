import { Body, Controller, Get, HttpStatus, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateBillOfMaterialUseCase } from "../application/use-cases/create-bill-of-material.use-case";
import { SetBillOfMaterialStatusUseCase } from "../application/use-cases/set-bill-of-material-status.use-case";
import { ListBillsOfMaterialUseCase } from "../application/use-cases/list-bills-of-material.use-case";
import { GetBillOfMaterialUseCase } from "../application/use-cases/get-bill-of-material.use-case";
import { ListBillOfMaterialComponentsUseCase } from "../application/use-cases/list-bill-of-material-components.use-case";
import {
  BillOfMaterialComponentResponseDto,
  BillOfMaterialResponseDto,
  CreateBillOfMaterialDto,
  ListBillOfMaterialsQueryDto,
  SetBillOfMaterialStatusDto,
} from "./dto/bill-of-material.dto";
import { handleManufacturingError } from "./manufacturing-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Manufacturing")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/manufacturing/bills-of-material")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class BillsOfMaterialController {
  constructor(
    private readonly createBillOfMaterial: CreateBillOfMaterialUseCase,
    private readonly setStatus: SetBillOfMaterialStatusUseCase,
    private readonly listBillsOfMaterial: ListBillsOfMaterialUseCase,
    private readonly getBillOfMaterial: GetBillOfMaterialUseCase,
    private readonly listComponents: ListBillOfMaterialComponentsUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.boms.read")
  @ApiOperation({ summary: "List bills of material for the active company." })
  @ApiResponse({ status: HttpStatus.OK, type: [BillOfMaterialResponseDto] })
  async list(
    @Query() query: ListBillOfMaterialsQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<BillOfMaterialResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const bills = await this.listBillsOfMaterial.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { productId: query.productId, status: query.status, limit: query.limit ?? 50 },
      });
      return bills.map(BillOfMaterialResponseDto.fromDomain);
    } catch (error) {
      handleManufacturingError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.boms.manage")
  @ApiOperation({ summary: "Create a new, immutable bill of material version with its components." })
  @ApiResponse({ status: HttpStatus.CREATED, type: BillOfMaterialResponseDto })
  async create(
    @Body() dto: CreateBillOfMaterialDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<BillOfMaterialResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const billOfMaterial = await this.createBillOfMaterial.execute({
        tenantId: ctx.tenantId,
        companyId,
        productId: dto.productId,
        code: dto.code,
        name: dto.name,
        components: dto.components,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "manufacturing.bill_of_material.created",
        resource: "BillOfMaterial",
        resourceId: billOfMaterial.id,
        newValues: { productId: billOfMaterial.productId, code: billOfMaterial.code, version: billOfMaterial.version },
        correlationId: ctx.correlationId,
      });
      return BillOfMaterialResponseDto.fromDomain(billOfMaterial);
    } catch (error) {
      handleManufacturingError(error);
    }
  }

  @Get(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.boms.read")
  @ApiOperation({ summary: "Get a bill of material by id." })
  @ApiResponse({ status: HttpStatus.OK, type: BillOfMaterialResponseDto })
  async get(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<BillOfMaterialResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const billOfMaterial = await this.getBillOfMaterial.execute({ tenantId: ctx.tenantId, companyId, billOfMaterialId: id });
      return BillOfMaterialResponseDto.fromDomain(billOfMaterial);
    } catch (error) {
      handleManufacturingError(error);
    }
  }

  @Get(":id/components")
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.boms.read")
  @ApiOperation({ summary: "List a bill of material's components." })
  @ApiResponse({ status: HttpStatus.OK, type: [BillOfMaterialComponentResponseDto] })
  async listBillOfMaterialComponents(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<BillOfMaterialComponentResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const components = await this.listComponents.execute({ tenantId: ctx.tenantId, companyId, billOfMaterialId: id });
      return components.map(BillOfMaterialComponentResponseDto.fromDomain);
    } catch (error) {
      handleManufacturingError(error);
    }
  }

  @Put(":id/status")
  @UseGuards(PermissionGuard)
  @RequirePermission("manufacturing.boms.manage")
  @ApiOperation({ summary: "Activate or deactivate a bill of material." })
  @ApiResponse({ status: HttpStatus.OK, type: BillOfMaterialResponseDto })
  async setBillOfMaterialStatus(
    @Param("id") id: string,
    @Body() dto: SetBillOfMaterialStatusDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<BillOfMaterialResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const billOfMaterial = await this.setStatus.execute({
        tenantId: ctx.tenantId,
        companyId,
        billOfMaterialId: id,
        status: dto.status,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "manufacturing.bill_of_material.status_changed",
        resource: "BillOfMaterial",
        resourceId: billOfMaterial.id,
        newValues: { status: billOfMaterial.status },
        correlationId: ctx.correlationId,
      });
      return BillOfMaterialResponseDto.fromDomain(billOfMaterial);
    } catch (error) {
      handleManufacturingError(error);
    }
  }
}
