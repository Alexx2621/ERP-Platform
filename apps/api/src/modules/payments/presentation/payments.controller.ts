import { Body, Controller, Get, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ApiTenantHeaders } from "../../../shared/swagger/api-tenant-headers.decorator";
import { SessionAuthGuard } from "../../../core/auth";
import { TenantContextGuard, CurrentTenantContext } from "../../../core/tenants";
import type { TenantExecutionContext } from "../../../core/tenants";
import { PermissionGuard, RequirePermission } from "../../../core/access-control";
import { RecordAuditEntryUseCase } from "../../../core/audit";
import { CapturePaymentUseCase } from "../application/use-cases/capture-payment.use-case";
import { RefundPaymentUseCase } from "../application/use-cases/refund-payment.use-case";
import { ListPaymentsUseCase } from "../application/use-cases/list-payments.use-case";
import { CapturePaymentDto, ListPaymentsQueryDto, PaymentResponseDto } from "./dto/payment.dto";
import { handlePaymentsError } from "./payments-error.mapper";
import { requireCompanyId } from "./require-company-id";

@ApiTags("Payments")
@ApiBearerAuth("session")
@ApiTenantHeaders()
@Controller("api/v1/payments")
@UseGuards(SessionAuthGuard, TenantContextGuard)
export class PaymentsController {
  constructor(
    private readonly capturePayment: CapturePaymentUseCase,
    private readonly refundPayment: RefundPaymentUseCase,
    private readonly listPayments: ListPaymentsUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission("payments.read")
  @ApiOperation({ summary: "List payments for the active company, optionally scoped to one sales order." })
  @ApiResponse({ status: HttpStatus.OK, type: [PaymentResponseDto] })
  async list(
    @Query() query: ListPaymentsQueryDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PaymentResponseDto[]> {
    try {
      const companyId = requireCompanyId(ctx);
      const payments = await this.listPayments.execute({
        tenantId: ctx.tenantId,
        companyId,
        filter: { salesOrderId: query.salesOrderId, limit: query.limit ?? 50 },
      });
      return payments.map(PaymentResponseDto.fromDomain);
    } catch (error) {
      handlePaymentsError(error);
    }
  }

  @Post("capture")
  @UseGuards(PermissionGuard)
  @RequirePermission("payments.manage")
  @ApiOperation({
    summary:
      "Capture a payment against a sales order via CASH or BANK_TRANSFER. Idempotent by idempotencyKey — a retried request returns the original outcome instead of capturing twice.",
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: PaymentResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "The gateway declined the capture; the payment is recorded as FAILED, not thrown as an error." })
  async capture(
    @Body() dto: CapturePaymentDto,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PaymentResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const { payment, wasReplayed } = await this.capturePayment.execute({ tenantId: ctx.tenantId, companyId, ...dto });
      if (!wasReplayed) {
        await this.recordAuditEntry.execute({
          userId: ctx.actor.userId,
          tenantId: ctx.tenantId,
          companyId,
          action: "payments.payment.captured",
          resource: "Payment",
          resourceId: payment.id,
          newValues: { salesOrderId: payment.salesOrderId, method: payment.method, status: payment.status, amount: payment.amount },
          correlationId: ctx.correlationId,
        });
      }
      return PaymentResponseDto.fromDomain(payment);
    } catch (error) {
      handlePaymentsError(error);
    }
  }

  @Post(":id/refund")
  @UseGuards(PermissionGuard)
  @RequirePermission("payments.manage")
  @ApiOperation({ summary: "Refund a CAPTURED payment in full." })
  @ApiResponse({ status: HttpStatus.CREATED, type: PaymentResponseDto })
  async refund(
    @Param("id") id: string,
    @CurrentTenantContext() ctx: TenantExecutionContext,
  ): Promise<PaymentResponseDto> {
    try {
      const companyId = requireCompanyId(ctx);
      const payment = await this.refundPayment.execute({ tenantId: ctx.tenantId, companyId, paymentId: id });
      await this.recordAuditEntry.execute({
        userId: ctx.actor.userId,
        tenantId: ctx.tenantId,
        companyId,
        action: "payments.payment.refunded",
        resource: "Payment",
        resourceId: payment.id,
        newValues: { status: payment.status },
        correlationId: ctx.correlationId,
      });
      return PaymentResponseDto.fromDomain(payment);
    } catch (error) {
      handlePaymentsError(error);
    }
  }
}
