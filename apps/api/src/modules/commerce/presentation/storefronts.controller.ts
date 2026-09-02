import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { GetProductUseCase } from "../../catalog";
import { CreateStorefrontUseCase } from "../application/use-cases/create-storefront.use-case";
import { SetStorefrontStatusUseCase } from "../application/use-cases/set-storefront-status.use-case";
import { ListStorefrontsUseCase } from "../application/use-cases/list-storefronts.use-case";
import { PublishProductUseCase } from "../application/use-cases/publish-product.use-case";
import { UnpublishProductUseCase } from "../application/use-cases/unpublish-product.use-case";
import { ListStorefrontProductsUseCase } from "../application/use-cases/list-storefront-products.use-case";
import { ListCommerceOrdersUseCase } from "../application/use-cases/list-commerce-orders.use-case";
import {
  CreateStorefrontDto,
  ListStorefrontsQueryDto,
  SetStorefrontStatusDto,
  StorefrontResponseDto,
} from "./dto/storefront.dto";
import { ListStorefrontProductsQueryDto, PublishProductDto, StorefrontProductResponseDto } from "./dto/storefront-product.dto";
import { CommerceOrderResponseDto, ListCommerceOrdersQueryDto } from "./dto/commerce-order.dto";
import { handleCommerceError } from "./commerce-error.mapper";
import { requireCompanyId } from "./require-company-id";

/** Admin, authenticated side of Commerce — storefront CRUD, catalog publication and the checkout order index. See `StorefrontPublicController` for the anonymous shopper-facing side. */
@ApiTags("Commerce")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/commerce")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class StorefrontsController {
  constructor(
    private readonly createStorefront: CreateStorefrontUseCase,
    private readonly setStorefrontStatus: SetStorefrontStatusUseCase,
    private readonly listStorefronts: ListStorefrontsUseCase,
    private readonly publishProduct: PublishProductUseCase,
    private readonly unpublishProduct: UnpublishProductUseCase,
    private readonly listStorefrontProducts: ListStorefrontProductsUseCase,
    private readonly listCommerceOrders: ListCommerceOrdersUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
    private readonly getProduct: GetProductUseCase,
  ) {}

  @Get("storefronts")
  @UseGuards(PermissionGuard)
  @RequirePermission("commerce.storefronts.read")
  @ApiOperation({ summary: "List the company's storefronts." })
  @ApiResponse({ status: HttpStatus.OK, type: [StorefrontResponseDto] })
  async list(@Query() query: ListStorefrontsQueryDto, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<StorefrontResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const storefronts = await this.listStorefronts.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { status: query.status, limit: query.limit ?? 50 },
      });
      return storefronts.map(StorefrontResponseDto.fromDomain);
    } catch (error) {
      handleCommerceError(error);
    }
  }

  @Post("storefronts")
  @UseGuards(PermissionGuard)
  @RequirePermission("commerce.storefronts.manage")
  @ApiOperation({ summary: "Create a storefront. `code` is globally unique — it is the public handle shoppers/the Next.js storefront use." })
  @ApiResponse({ status: HttpStatus.CREATED, type: StorefrontResponseDto })
  async create(@Body() dto: CreateStorefrontDto, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<StorefrontResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const storefront = await this.createStorefront.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "commerce.storefront.created",
        resource: "Storefront",
        resourceId: storefront.id,
        newValues: { code: storefront.code, name: storefront.name, currency: storefront.currency },
        correlationId: ctx.correlationId,
      });
      return StorefrontResponseDto.fromDomain(storefront);
    } catch (error) {
      handleCommerceError(error);
    }
  }

  @Put("storefronts/:id/status")
  @UseGuards(PermissionGuard)
  @RequirePermission("commerce.storefronts.manage")
  @ApiOperation({ summary: "Activate or deactivate a storefront." })
  @ApiResponse({ status: HttpStatus.OK, type: StorefrontResponseDto })
  async setStatusRoute(
    @Param("id") id: string,
    @Body() dto: SetStorefrontStatusDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<StorefrontResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const storefront = await this.setStorefrontStatus.execute({ tenantId: ctx.tenantId, companyId, id, status: dto.status });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "commerce.storefront.status_changed",
        resource: "Storefront",
        resourceId: storefront.id,
        newValues: { status: storefront.status },
        correlationId: ctx.correlationId,
      });
      return StorefrontResponseDto.fromDomain(storefront);
    } catch (error) {
      handleCommerceError(error);
    }
  }

  @Get("storefronts/:id/products")
  @UseGuards(PermissionGuard)
  @RequirePermission("commerce.storefronts.read")
  @ApiOperation({ summary: "List a storefront's catalog publications, enriched with the product's own code/name." })
  @ApiResponse({ status: HttpStatus.OK, type: [StorefrontProductResponseDto] })
  async listProducts(
    @Param("id") id: string,
    @Query() query: ListStorefrontProductsQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<StorefrontProductResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const rows = await this.listStorefrontProducts.execute({
        tenantId: ctx.tenantId,
        companyId,
        storefrontId: id,
        filter: { limit: query.limit ?? 100 },
      });
      return rows.map(StorefrontProductResponseDto.fromDomain);
    } catch (error) {
      handleCommerceError(error);
    }
  }

  @Post("storefronts/:id/products")
  @UseGuards(PermissionGuard)
  @RequirePermission("commerce.storefronts.manage")
  @ApiOperation({ summary: "Publish a product to a storefront (idempotent)." })
  @ApiResponse({ status: HttpStatus.CREATED, type: StorefrontProductResponseDto })
  async publish(
    @Param("id") id: string,
    @Body() dto: PublishProductDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<StorefrontProductResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const publication = await this.publishProduct.execute({ tenantId: ctx.tenantId, companyId, storefrontId: id, productId: dto.productId });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "commerce.storefront_product.published",
        resource: "StorefrontProduct",
        resourceId: publication.id,
        newValues: { storefrontId: id, productId: dto.productId },
        correlationId: ctx.correlationId,
      });
      const product = await this.getProduct.execute(ctx.tenantId, publication.productId);
      return StorefrontProductResponseDto.fromDomain({ publication, productCode: product?.code ?? "?", productName: product?.name ?? "?" });
    } catch (error) {
      handleCommerceError(error);
    }
  }

  @Delete("storefronts/:id/products/:productId")
  @UseGuards(PermissionGuard)
  @RequirePermission("commerce.storefronts.manage")
  @ApiOperation({ summary: "Unpublish a product from a storefront." })
  @ApiResponse({ status: HttpStatus.OK, type: StorefrontProductResponseDto })
  async unpublish(
    @Param("id") id: string,
    @Param("productId") productId: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<StorefrontProductResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const publication = await this.unpublishProduct.execute({ tenantId: ctx.tenantId, companyId, storefrontId: id, productId });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "commerce.storefront_product.unpublished",
        resource: "StorefrontProduct",
        resourceId: publication.id,
        newValues: { storefrontId: id, productId },
        correlationId: ctx.correlationId,
      });
      const product = await this.getProduct.execute(ctx.tenantId, publication.productId);
      return StorefrontProductResponseDto.fromDomain({ publication, productCode: product?.code ?? "?", productName: product?.name ?? "?" });
    } catch (error) {
      handleCommerceError(error);
    }
  }

  @Get("orders")
  @UseGuards(PermissionGuard)
  @RequirePermission("commerce.orders.read")
  @ApiOperation({ summary: "List completed checkouts for the company. The linked SalesOrder/Payment are managed from Sales/Payments' own screens." })
  @ApiResponse({ status: HttpStatus.OK, type: [CommerceOrderResponseDto] })
  async listOrders(@Query() query: ListCommerceOrdersQueryDto, @CurrentTenantContext() ctx: TenantExecutionContext): Promise<CommerceOrderResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const orders = await this.listCommerceOrders.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { storefrontId: query.storefrontId, limit: query.limit ?? 50 },
      });
      return orders.map(CommerceOrderResponseDto.fromDomain);
    } catch (error) {
      handleCommerceError(error);
    }
  }
}
