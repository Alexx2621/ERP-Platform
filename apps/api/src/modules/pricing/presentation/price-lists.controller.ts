import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { AppEnablementGuard, RequireApp } from "../../../core/app-registry";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreatePriceListUseCase } from "../application/use-cases/create-price-list.use-case";
import { UpdatePriceListUseCase } from "../application/use-cases/update-price-list.use-case";
import { ListPriceListsUseCase } from "../application/use-cases/list-price-lists.use-case";
import { SetPriceListStatusUseCase } from "../application/use-cases/set-price-list-status.use-case";
import { AddPriceListItemUseCase } from "../application/use-cases/add-price-list-item.use-case";
import { UpdatePriceListItemUseCase } from "../application/use-cases/update-price-list-item.use-case";
import { RemovePriceListItemUseCase } from "../application/use-cases/remove-price-list-item.use-case";
import { ListPriceListItemsUseCase } from "../application/use-cases/list-price-list-items.use-case";
import {
  CreatePriceListDto,
  PriceListResponseDto,
  SetPriceListStatusDto,
  UpdatePriceListDto,
} from "./dto/price-list.dto";
import { AddPriceListItemDto, PriceListItemResponseDto, UpdatePriceListItemDto } from "./dto/price-list-item.dto";
import { handlePricingError } from "./pricing-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Pricing")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/pricing/price-lists")
@UseGuards(SessionAuthGuard, TenantContextGuard, AppEnablementGuard)
@RequireApp("pricing")
export class PriceListsController {
  constructor(
    private readonly createPriceList: CreatePriceListUseCase,
    private readonly updatePriceList: UpdatePriceListUseCase,
    private readonly listPriceLists: ListPriceListsUseCase,
    private readonly setStatus: SetPriceListStatusUseCase,
    private readonly addItem: AddPriceListItemUseCase,
    private readonly updateItem: UpdatePriceListItemUseCase,
    private readonly removeItem: RemovePriceListItemUseCase,
    private readonly listItems: ListPriceListItemsUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("pricing.price-lists.read")
  @ApiOperation({ summary: "List the active company's price lists." })
  @ApiResponse({ status: HttpStatus.OK, type: [PriceListResponseDto] })
  async list(@CurrentTenantContext() ctx: TenantExecutionContext): Promise<PriceListResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const priceLists = await this.listPriceLists.execute(ctx.tenantId, companyId);
      return priceLists.map(PriceListResponseDto.fromDomain);
    } catch (error) {
      handlePricingError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("pricing.price-lists.manage")
  @ApiOperation({ summary: "Create a price list for the active company." })
  @ApiResponse({ status: HttpStatus.CREATED, type: PriceListResponseDto })
  async create(
    @Body() dto: CreatePriceListDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PriceListResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const priceList = await this.createPriceList.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "pricing.price_list.created",
        resource: "PriceList",
        resourceId: priceList.id,
        newValues: { code: priceList.code, name: priceList.name, currency: priceList.currency },
        correlationId: ctx.correlationId,
      });
      return PriceListResponseDto.fromDomain(priceList);
    } catch (error) {
      handlePricingError(error);
    }
  }

  @Put(":id")
  @UseGuards(PermissionGuard)
  @RequirePermission("pricing.price-lists.manage")
  @ApiOperation({ summary: "Update a price list." })
  @ApiResponse({ status: HttpStatus.OK, type: PriceListResponseDto })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdatePriceListDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PriceListResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const priceList = await this.updatePriceList.execute({ tenantId: ctx.tenantId, companyId, id, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "pricing.price_list.updated",
        resource: "PriceList",
        resourceId: priceList.id,
        newValues: { name: priceList.name, currency: priceList.currency },
        correlationId: ctx.correlationId,
      });
      return PriceListResponseDto.fromDomain(priceList);
    } catch (error) {
      handlePricingError(error);
    }
  }

  @Put(":id/status")
  @UseGuards(PermissionGuard)
  @RequirePermission("pricing.price-lists.manage")
  @ApiOperation({ summary: "Activate or deactivate a price list." })
  @ApiResponse({ status: HttpStatus.OK, type: PriceListResponseDto })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: SetPriceListStatusDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PriceListResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const priceList = await this.setStatus.execute({ tenantId: ctx.tenantId, companyId, id, status: dto.status });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "pricing.price_list.status_changed",
        resource: "PriceList",
        resourceId: priceList.id,
        newValues: { status: priceList.status },
        correlationId: ctx.correlationId,
      });
      return PriceListResponseDto.fromDomain(priceList);
    } catch (error) {
      handlePricingError(error);
    }
  }

  @Get(":id/items")
  @UseGuards(PermissionGuard)
  @RequirePermission("pricing.price-lists.read")
  @ApiOperation({ summary: "List a price list's items." })
  @ApiResponse({ status: HttpStatus.OK, type: [PriceListItemResponseDto] })
  async listPriceListItems(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PriceListItemResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const items = await this.listItems.execute({ tenantId: ctx.tenantId, companyId, priceListId: id });
      return items.map(PriceListItemResponseDto.fromDomain);
    } catch (error) {
      handlePricingError(error);
    }
  }

  @Post(":id/items")
  @UseGuards(PermissionGuard)
  @RequirePermission("pricing.price-lists.manage")
  @ApiOperation({ summary: "Add a product's price to a price list. Products with variants are not supported in this slice." })
  @ApiResponse({ status: HttpStatus.CREATED, type: PriceListItemResponseDto })
  async addPriceListItem(
    @Param("id") id: string,
    @Body() dto: AddPriceListItemDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PriceListItemResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const item = await this.addItem.execute({ tenantId: ctx.tenantId, companyId, priceListId: id, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "pricing.price_list_item.added",
        resource: "PriceListItem",
        resourceId: item.id,
        newValues: { priceListId: id, productId: item.productId, price: item.price },
        correlationId: ctx.correlationId,
      });
      return PriceListItemResponseDto.fromDomain(item);
    } catch (error) {
      handlePricingError(error);
    }
  }

  @Put(":id/items/:itemId")
  @UseGuards(PermissionGuard)
  @RequirePermission("pricing.price-lists.manage")
  @ApiOperation({ summary: "Reprice a price list item." })
  @ApiResponse({ status: HttpStatus.OK, type: PriceListItemResponseDto })
  async updatePriceListItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdatePriceListItemDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PriceListItemResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const item = await this.updateItem.execute({ tenantId: ctx.tenantId, companyId, priceListId: id, itemId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "pricing.price_list_item.updated",
        resource: "PriceListItem",
        resourceId: item.id,
        newValues: { price: item.price },
        correlationId: ctx.correlationId,
      });
      return PriceListItemResponseDto.fromDomain(item);
    } catch (error) {
      handlePricingError(error);
    }
  }

  @Delete(":id/items/:itemId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(PermissionGuard)
  @RequirePermission("pricing.price-lists.manage")
  @ApiOperation({ summary: "Remove a price list item." })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async removePriceListItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<void> {
    try {
      const companyId = requireCompanyId(ctx);
      await this.removeItem.execute({ tenantId: ctx.tenantId, companyId, priceListId: id, itemId });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "pricing.price_list_item.removed",
        resource: "PriceListItem",
        resourceId: itemId,
        newValues: { priceListId: id },
        correlationId: ctx.correlationId,
      });
    } catch (error) {
      handlePricingError(error);
    }
  }
}
