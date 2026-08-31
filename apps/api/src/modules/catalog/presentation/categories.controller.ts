import { Body, Controller, Get, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateCategoryUseCase } from "../application/use-cases/create-category.use-case";
import { UpdateCategoryUseCase } from "../application/use-cases/update-category.use-case";
import { ListCategoriesUseCase } from "../application/use-cases/list-categories.use-case";
import { SetCategoryStatusUseCase } from "../application/use-cases/set-category-status.use-case";
import {
  CategoryResponseDto,
  CreateCategoryDto,
  SetCategoryStatusDto,
  UpdateCategoryDto,
} from "./dto/category.dto";
import { handleCatalogError } from "./catalog-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Catalog")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/catalog/categories")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class CategoriesController {
  constructor(
    private readonly createCategory: CreateCategoryUseCase,
    private readonly updateCategory: UpdateCategoryUseCase,
    private readonly listCategories: ListCategoriesUseCase,
    private readonly setStatus: SetCategoryStatusUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.categories.read")
  @ApiOperation({ summary: "List the active company's categories." })
  @ApiResponse({ status: HttpStatus.OK, type: [CategoryResponseDto] })
  async list(@CurrentTenantContext() ctx: TenantExecutionContext): Promise<CategoryResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const categories = await this.listCategories.execute(ctx.tenantId, companyId);
      return categories.map(CategoryResponseDto.fromDomain);
    } catch (error) {
      handleCatalogError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.categories.manage")
  @ApiOperation({ summary: "Create a category, optionally nested under a parent." })
  @ApiResponse({ status: HttpStatus.CREATED, type: CategoryResponseDto })
  async create(
    @Body() dto: CreateCategoryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<CategoryResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const category = await this.createCategory.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "catalog.category.created",
        resource: "Category",
        resourceId: category.id,
        newValues: { code: category.code, name: category.name, parentId: category.parentId },
        correlationId: ctx.correlationId,
      });
      return CategoryResponseDto.fromDomain(category);
    } catch (error) {
      handleCatalogError(error);
    }
  }

  @Put(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.categories.manage")
  @ApiOperation({ summary: "Rename or re-parent a category." })
  @ApiResponse({ status: HttpStatus.OK, type: CategoryResponseDto })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<CategoryResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const category = await this.updateCategory.execute({
        tenantId: ctx.tenantId,
        companyId,
        id,
        name: dto.name,
        parentId: dto.parentId,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "catalog.category.updated",
        resource: "Category",
        resourceId: category.id,
        newValues: { name: category.name, parentId: category.parentId },
        correlationId: ctx.correlationId,
      });
      return CategoryResponseDto.fromDomain(category);
    } catch (error) {
      handleCatalogError(error);
    }
  }

  @Put(":id/status")
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.categories.manage")
  @ApiOperation({ summary: "Activate or deactivate a category." })
  @ApiResponse({ status: HttpStatus.OK, type: CategoryResponseDto })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: SetCategoryStatusDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<CategoryResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const category = await this.setStatus.execute({ tenantId: ctx.tenantId, companyId, id, status: dto.status });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "catalog.category.status_changed",
        resource: "Category",
        resourceId: category.id,
        newValues: { status: category.status },
        correlationId: ctx.correlationId,
      });
      return CategoryResponseDto.fromDomain(category);
    } catch (error) {
      handleCatalogError(error);
    }
  }
}
