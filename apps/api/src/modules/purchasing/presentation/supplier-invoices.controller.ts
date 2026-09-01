import { Body, Controller, Get, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateSupplierInvoiceUseCase } from "../application/use-cases/create-supplier-invoice.use-case";
import { CancelSupplierInvoiceUseCase } from "../application/use-cases/cancel-supplier-invoice.use-case";
import { ListSupplierInvoicesUseCase } from "../application/use-cases/list-supplier-invoices.use-case";
import { CreateSupplierInvoiceDto, ListSupplierInvoicesQueryDto, SupplierInvoiceResponseDto } from "./dto/supplier-invoice.dto";
import { handlePurchasingError } from "./purchasing-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Purchasing")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/purchasing/supplier-invoices")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class SupplierInvoicesController {
  constructor(
    private readonly createInvoice: CreateSupplierInvoiceUseCase,
    private readonly cancelInvoice: CancelSupplierInvoiceUseCase,
    private readonly listInvoices: ListSupplierInvoicesUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("purchasing.invoices.read")
  @ApiOperation({ summary: "List supplier invoices for the active company." })
  @ApiResponse({ status: HttpStatus.OK, type: [SupplierInvoiceResponseDto] })
  async list(
    @Query() query: ListSupplierInvoicesQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SupplierInvoiceResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const invoices = await this.listInvoices.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { purchaseOrderId: query.purchaseOrderId, supplierId: query.supplierId, limit: query.limit ?? 50 },
      });
      return invoices.map(SupplierInvoiceResponseDto.fromDomain);
    } catch (error) {
      handlePurchasingError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("purchasing.invoices.manage")
  @ApiOperation({ summary: "Record a supplier's own invoice as its own document, traced to a purchase order." })
  @ApiResponse({ status: HttpStatus.CREATED, type: SupplierInvoiceResponseDto })
  async create(
    @Body() dto: CreateSupplierInvoiceDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SupplierInvoiceResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const invoice = await this.createInvoice.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "purchasing.supplier_invoice.created",
        resource: "SupplierInvoice",
        resourceId: invoice.id,
        newValues: { supplierId: invoice.supplierId, purchaseOrderId: invoice.purchaseOrderId, amount: invoice.amount },
        correlationId: ctx.correlationId,
      });
      return SupplierInvoiceResponseDto.fromDomain(invoice);
    } catch (error) {
      handlePurchasingError(error);
    }
  }

  @Post(":id/cancel")
  @UseGuards(PermissionGuard)
  @RequirePermission("purchasing.invoices.manage")
  @ApiOperation({ summary: "Cancel a RECORDED supplier invoice." })
  @ApiResponse({ status: HttpStatus.CREATED, type: SupplierInvoiceResponseDto })
  async cancel(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SupplierInvoiceResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const invoice = await this.cancelInvoice.execute({ tenantId: ctx.tenantId, companyId, supplierInvoiceId: id });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "purchasing.supplier_invoice.cancelled",
        resource: "SupplierInvoice",
        resourceId: invoice.id,
        newValues: { status: invoice.status },
        correlationId: ctx.correlationId,
      });
      return SupplierInvoiceResponseDto.fromDomain(invoice);
    } catch (error) {
      handlePurchasingError(error);
    }
  }
}
