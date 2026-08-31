import { Body, Controller, Get, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateBrandUseCase } from "../application/use-cases/create-brand.use-case";
import { UpdateBrandUseCase } from "../application/use-cases/update-brand.use-case";
import { ListBrandsUseCase } from "../application/use-cases/list-brands.use-case";
import { SetBrandStatusUseCase } from "../application/use-cases/set-brand-status.use-case";
import { BrandResponseDto, CreateBrandDto, SetBrandStatusDto, UpdateBrandDto } from "./dto/brand.dto";
import { handleCatalogError } from "./catalog-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Catalog")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/catalog/brands")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class BrandsController {
  constructor(
    private readonly createBrand: CreateBrandUseCase,
    private readonly updateBrand: UpdateBrandUseCase,
    private readonly listBrands: ListBrandsUseCase,
    private readonly setStatus: SetBrandStatusUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.brands.read")
  @ApiOperation({ summary: "List the active company's brands." })
  @ApiResponse({ status: HttpStatus.OK, type: [BrandResponseDto] })
  async list(@CurrentTenantContext() ctx: TenantExecutionContext): Promise<BrandResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const brands = await this.listBrands.execute(ctx.tenantId, companyId);
      return brands.map(BrandResponseDto.fromDomain);
    } catch (error) {
      handleCatalogError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.brands.manage")
  @ApiOperation({ summary: "Create a brand for the active company." })
  @ApiResponse({ status: HttpStatus.CREATED, type: BrandResponseDto })
  async create(
    @Body() dto: CreateBrandDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<BrandResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const brand = await this.createBrand.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "catalog.brand.created",
        resource: "Brand",
        resourceId: brand.id,
        newValues: { code: brand.code, name: brand.name },
        correlationId: ctx.correlationId,
      });
      return BrandResponseDto.fromDomain(brand);
    } catch (error) {
      handleCatalogError(error);
    }
  }

  @Put(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.brands.manage")
  @ApiOperation({ summary: "Rename a brand." })
  @ApiResponse({ status: HttpStatus.OK, type: BrandResponseDto })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateBrandDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<BrandResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const brand = await this.updateBrand.execute({ tenantId: ctx.tenantId, companyId, id, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "catalog.brand.updated",
        resource: "Brand",
        resourceId: brand.id,
        newValues: { name: brand.name },
        correlationId: ctx.correlationId,
      });
      return BrandResponseDto.fromDomain(brand);
    } catch (error) {
      handleCatalogError(error);
    }
  }

  @Put(":id/status")
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.brands.manage")
  @ApiOperation({ summary: "Activate or deactivate a brand." })
  @ApiResponse({ status: HttpStatus.OK, type: BrandResponseDto })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: SetBrandStatusDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<BrandResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const brand = await this.setStatus.execute({ tenantId: ctx.tenantId, companyId, id, status: dto.status });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "catalog.brand.status_changed",
        resource: "Brand",
        resourceId: brand.id,
        newValues: { status: brand.status },
        correlationId: ctx.correlationId,
      });
      return BrandResponseDto.fromDomain(brand);
    } catch (error) {
      handleCatalogError(error);
    }
  }
}
