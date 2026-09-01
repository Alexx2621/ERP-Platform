import { Body, Controller, Get, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CreateQuoteUseCase } from "../application/use-cases/create-quote.use-case";
import { AddQuoteLineUseCase } from "../application/use-cases/add-quote-line.use-case";
import { ListQuotesUseCase } from "../application/use-cases/list-quotes.use-case";
import { ListQuoteLinesUseCase } from "../application/use-cases/list-quote-lines.use-case";
import { ConvertQuoteToSalesOrderUseCase } from "../application/use-cases/convert-quote-to-sales-order.use-case";
import { CancelQuoteUseCase } from "../application/use-cases/cancel-quote.use-case";
import { CreateQuoteDto, ConvertQuoteDto, ListQuotesQueryDto, QuoteResponseDto } from "./dto/quote.dto";
import { AddQuoteLineDto, QuoteLineResponseDto } from "./dto/quote-line.dto";
import { SalesOrderResponseDto } from "./dto/sales-order.dto";
import { handleSalesError } from "./sales-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Sales")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/sales/quotes")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class QuotesController {
  constructor(
    private readonly createQuote: CreateQuoteUseCase,
    private readonly addLine: AddQuoteLineUseCase,
    private readonly listQuotes: ListQuotesUseCase,
    private readonly listLines: ListQuoteLinesUseCase,
    private readonly convertQuote: ConvertQuoteToSalesOrderUseCase,
    private readonly cancelQuote: CancelQuoteUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("sales.quotes.read")
  @ApiOperation({ summary: "List quotes for the active company." })
  @ApiResponse({ status: HttpStatus.OK, type: [QuoteResponseDto] })
  async list(
    @Query() query: ListQuotesQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<QuoteResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const quotes = await this.listQuotes.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { status: query.status, customerId: query.customerId, limit: query.limit ?? 50 },
      });
      return quotes.map(QuoteResponseDto.fromDomain);
    } catch (error) {
      handleSalesError(error);
    }
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission("sales.quotes.manage")
  @ApiOperation({ summary: "Create a quote for the active company." })
  @ApiResponse({ status: HttpStatus.CREATED, type: QuoteResponseDto })
  async create(
    @Body() dto: CreateQuoteDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<QuoteResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const quote = await this.createQuote.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "sales.quote.created",
        resource: "Quote",
        resourceId: quote.id,
        newValues: { customerId: quote.customerId, currency: quote.currency },
        correlationId: ctx.correlationId,
      });
      return QuoteResponseDto.fromDomain(quote);
    } catch (error) {
      handleSalesError(error);
    }
  }

  @Get(":id/lines")
  @UseGuards(PermissionGuard)
  @RequirePermission("sales.quotes.read")
  @ApiOperation({ summary: "List a quote's lines." })
  @ApiResponse({ status: HttpStatus.OK, type: [QuoteLineResponseDto] })
  async listQuoteLines(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<QuoteLineResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const lines = await this.listLines.execute({ tenantId: ctx.tenantId, companyId, quoteId: id });
      return lines.map(QuoteLineResponseDto.fromDomain);
    } catch (error) {
      handleSalesError(error);
    }
  }

  @Post(":id/lines")
  @UseGuards(PermissionGuard)
  @RequirePermission("sales.quotes.manage")
  @ApiOperation({ summary: "Add a pricing-snapshot line to a DRAFT quote." })
  @ApiResponse({ status: HttpStatus.CREATED, type: QuoteLineResponseDto })
  async addQuoteLine(
    @Param("id") id: string,
    @Body() dto: AddQuoteLineDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<QuoteLineResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const line = await this.addLine.execute({ tenantId: ctx.tenantId, companyId, quoteId: id, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "sales.quote_line.added",
        resource: "QuoteLine",
        resourceId: line.id,
        newValues: { quoteId: id, productId: line.productId, quantity: line.quantity, lineTotal: line.lineTotal },
        correlationId: ctx.correlationId,
      });
      return QuoteLineResponseDto.fromDomain(line);
    } catch (error) {
      handleSalesError(error);
    }
  }

  @Post(":id/convert")
  @UseGuards(PermissionGuard)
  @RequirePermission("sales.quotes.manage")
  @ApiOperation({ summary: "Convert a DRAFT quote into a new DRAFT sales order, copying every line's pricing snapshot verbatim." })
  @ApiResponse({ status: HttpStatus.CREATED, type: SalesOrderResponseDto })
  async convert(
    @Param("id") id: string,
    @Body() dto: ConvertQuoteDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<SalesOrderResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const order = await this.convertQuote.execute({ tenantId: ctx.tenantId, companyId, quoteId: id, ...dto });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "sales.quote.converted",
        resource: "Quote",
        resourceId: id,
        newValues: { salesOrderId: order.id },
        correlationId: ctx.correlationId,
      });
      return SalesOrderResponseDto.fromDomain(order);
    } catch (error) {
      handleSalesError(error);
    }
  }

  @Post(":id/cancel")
  @UseGuards(PermissionGuard)
  @RequirePermission("sales.quotes.manage")
  @ApiOperation({ summary: "Cancel a DRAFT quote." })
  @ApiResponse({ status: HttpStatus.CREATED, type: QuoteResponseDto })
  async cancel(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<QuoteResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const quote = await this.cancelQuote.execute({ tenantId: ctx.tenantId, companyId, quoteId: id });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "sales.quote.cancelled",
        resource: "Quote",
        resourceId: quote.id,
        newValues: { status: quote.status },
        correlationId: ctx.correlationId,
      });
      return QuoteResponseDto.fromDomain(quote);
    } catch (error) {
      handleSalesError(error);
    }
  }
}
