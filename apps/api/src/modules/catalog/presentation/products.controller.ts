import { Body, Controller, Get, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { AppEnablementGuard, RequireApp } from "../../../core/app-registry";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateProductUseCase } from "../application/use-cases/create-product.use-case";
import { UpdateProductUseCase } from "../application/use-cases/update-product.use-case";
import { ListProductsUseCase } from "../application/use-cases/list-products.use-case";
import { SetProductStatusUseCase } from "../application/use-cases/set-product-status.use-case";
import { AddProductVariantUseCase } from "../application/use-cases/add-product-variant.use-case";
import { UpdateProductVariantUseCase } from "../application/use-cases/update-product-variant.use-case";
import { ListProductVariantsUseCase } from "../application/use-cases/list-product-variants.use-case";
import { SetProductVariantStatusUseCase } from "../application/use-cases/set-product-variant-status.use-case";
import {
  CreateProductDto,
  ProductResponseDto,
  SetProductStatusDto,
  UpdateProductDto,
} from "./dto/product.dto";
import {
  AddProductVariantDto,
  ProductVariantResponseDto,
  SetProductVariantStatusDto,
  UpdateProductVariantDto,
} from "./dto/product-variant.dto";
import { handleCatalogError } from "./catalog-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Catalog")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/products")
@UseGuards(SessionAuthGuard, TenantContextGuard, AppEnablementGuard)
@RequireApp("catalog")
export class ProductsController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly listProducts: ListProductsUseCase,
    private readonly setStatus: SetProductStatusUseCase,
    private readonly addVariant: AddProductVariantUseCase,
    private readonly updateVariant: UpdateProductVariantUseCase,
    private readonly listVariants: ListProductVariantsUseCase,
    private readonly setVariantStatus: SetProductVariantStatusUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.products.read")
  @ApiOperation({ summary: "List the active company's products." })
  @ApiResponse({ status: HttpStatus.OK, type: [ProductResponseDto] })
  async list(@CurrentTenantContext() ctx: TenantExecutionContext): Promise<ProductResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const products = await this.listProducts.execute(ctx.tenantId, companyId);
      return products.map(ProductResponseDto.fromDomain);
    } catch (error) {
      handleCatalogError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.products.manage")
  @ApiOperation({ summary: "Create a product for the active company." })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProductResponseDto })
  async create(
    @Body() dto: CreateProductDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const product = await this.createProduct.execute({
        tenantId: ctx.tenantId,
        companyId,
        ...dto,
        type: dto.type as never,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "catalog.product.created",
        resource: "Product",
        resourceId: product.id,
        newValues: { code: product.code, name: product.name },
        correlationId: ctx.correlationId,
      });
      return ProductResponseDto.fromDomain(product);
    } catch (error) {
      handleCatalogError(error);
    }
  }

  @Put(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.products.manage")
  @ApiOperation({ summary: "Update a product's editable fields." })
  @ApiResponse({ status: HttpStatus.OK, type: ProductResponseDto })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const product = await this.updateProduct.execute({ tenantId: ctx.tenantId, companyId, id, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "catalog.product.updated",
        resource: "Product",
        resourceId: product.id,
        newValues: { name: product.name, basePrice: product.basePrice },
        correlationId: ctx.correlationId,
      });
      return ProductResponseDto.fromDomain(product);
    } catch (error) {
      handleCatalogError(error);
    }
  }

  @Put(":id/status")
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.products.manage")
  @ApiOperation({ summary: "Change a product's lifecycle status." })
  @ApiResponse({ status: HttpStatus.OK, type: ProductResponseDto })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: SetProductStatusDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const product = await this.setStatus.execute({ tenantId: ctx.tenantId, companyId, id, status: dto.status });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "catalog.product.status_changed",
        resource: "Product",
        resourceId: product.id,
        newValues: { status: product.status },
        correlationId: ctx.correlationId,
      });
      return ProductResponseDto.fromDomain(product);
    } catch (error) {
      handleCatalogError(error);
    }
  }

  @Get(":id/variants")
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.products.read")
  @ApiOperation({ summary: "List a product's variants." })
  @ApiResponse({ status: HttpStatus.OK, type: [ProductVariantResponseDto] })
  async listProductVariants(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductVariantResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const variants = await this.listVariants.execute(ctx.tenantId, companyId, id);
      return variants.map(ProductVariantResponseDto.fromDomain);
    } catch (error) {
      handleCatalogError(error);
    }
  }

  @Post(":id/variants")
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.products.manage")
  @ApiOperation({ summary: "Add a sellable variant to a hasVariants product." })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProductVariantResponseDto })
  async addProductVariant(
    @Param("id") id: string,
    @Body() dto: AddProductVariantDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductVariantResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const variant = await this.addVariant.execute({
        tenantId: ctx.tenantId,
        companyId,
        productId: id,
        ...dto,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "catalog.product_variant.created",
        resource: "ProductVariant",
        resourceId: variant.id,
        newValues: { sku: variant.sku, attributes: variant.attributes, price: variant.price },
        correlationId: ctx.correlationId,
      });
      return ProductVariantResponseDto.fromDomain(variant);
    } catch (error) {
      handleCatalogError(error);
    }
  }

  @Put(":id/variants/:variantId")
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.products.manage")
  @ApiOperation({ summary: "Reprice a product variant." })
  @ApiResponse({ status: HttpStatus.OK, type: ProductVariantResponseDto })
  async updateProductVariant(
    @Param("id") id: string,
    @Param("variantId") variantId: string,
    @Body() dto: UpdateProductVariantDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductVariantResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const variant = await this.updateVariant.execute({
        tenantId: ctx.tenantId,
        companyId,
        productId: id,
        variantId,
        ...dto,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "catalog.product_variant.updated",
        resource: "ProductVariant",
        resourceId: variant.id,
        newValues: { price: variant.price, cost: variant.cost },
        correlationId: ctx.correlationId,
      });
      return ProductVariantResponseDto.fromDomain(variant);
    } catch (error) {
      handleCatalogError(error);
    }
  }

  @Put(":id/variants/:variantId/status")
  @UseGuards(PermissionGuard)
  @RequirePermission("catalog.products.manage")
  @ApiOperation({ summary: "Activate or deactivate a product variant." })
  @ApiResponse({ status: HttpStatus.OK, type: ProductVariantResponseDto })
  async updateProductVariantStatus(
    @Param("id") id: string,
    @Param("variantId") variantId: string,
    @Body() dto: SetProductVariantStatusDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<ProductVariantResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const variant = await this.setVariantStatus.execute({
        tenantId: ctx.tenantId,
        companyId,
        productId: id,
        variantId,
        status: dto.status,
      });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "catalog.product_variant.status_changed",
        resource: "ProductVariant",
        resourceId: variant.id,
        newValues: { status: variant.status },
        correlationId: ctx.correlationId,
      });
      return ProductVariantResponseDto.fromDomain(variant);
    } catch (error) {
      handleCatalogError(error);
    }
  }
}
