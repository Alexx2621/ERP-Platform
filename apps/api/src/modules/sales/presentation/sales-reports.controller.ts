import { Controller, Get, HttpStatus, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { AppEnablementGuard, RequireApp } from "../../../core/app-registry";
import { GetTopSellingProductsUseCase } from "../application/use-cases/get-top-selling-products.use-case";
import { TopSellingProductResponseDto, TopSellingProductsQueryDto } from "./dto/sales-reports.dto";
import { handleSalesError } from "./sales-error.mapper";
import { requireCompanyId } from "./require-company-id";

/**
 * Separate from `SalesOrdersController` on purpose: a literal `reports/...`
 * sub-path here would otherwise need to be declared before that
 * controller's `@Get(":id")` route to avoid being shadowed by it — a
 * distinct base path (`/api/v1/sales/reports`) avoids the ordering
 * dependency entirely, the same reasoning `AccountingReportsController`
 * already applied.
 */
@ApiTags("Sales")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/sales/reports")
@UseGuards(SessionAuthGuard, TenantContextGuard, AppEnablementGuard)
@RequireApp("sales")
export class SalesReportsController {
  constructor(private readonly getTopSellingProducts: GetTopSellingProductsUseCase) {}

  @Get("top-products")
  @UseGuards(PermissionGuard)
  @RequirePermission("sales.orders.read")
  @ApiOperation({
    summary: "Products ranked by revenue over a recent window, aggregated fresh from the sales ledger.",
  })
  @ApiResponse({ status: HttpStatus.OK, type: [TopSellingProductResponseDto] })
  async topProducts(
    @Query() query: TopSellingProductsQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<TopSellingProductResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const items = await this.getTopSellingProducts.execute({
        tenantId: ctx.tenantId,
        companyId,
        sinceDays: query.days ?? 30,
        limit: query.limit ?? 5,
      });
      return items.map(TopSellingProductResponseDto.fromDomain);
    } catch (error) {
      handleSalesError(error);
    }
  }
}
