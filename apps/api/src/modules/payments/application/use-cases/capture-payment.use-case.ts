import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { GetSalesOrderUseCase } from "../../../sales";
import { Payment, PaymentMethod } from "../../domain/payment.entity";
import { PAYMENT_REPOSITORY, PaymentRepository } from "../../domain/payment.repository";
import { PAYMENT_GATEWAYS, PaymentGateway } from "../ports/payment-gateway.port";
import { PaymentCurrencyMismatchError, PaymentIdempotencyConflictError, PaymentSalesOrderNotFoundError } from "../errors";

export interface CapturePaymentInput {
  tenantId: string;
  companyId: string;
  salesOrderId: string;
  method: PaymentMethod;
  amount: string;
  currency: string;
  idempotencyKey: string;
  reference?: string | null;
}

export interface CapturePaymentResult {
  payment: Payment;
  /** True when this call replayed an already-captured/-failed payment instead of calling the gateway — the caller (e.g. the audit trail) must not record a fresh "captured" event for a replay. */
  wasReplayed: boolean;
}

/**
 * Idempotent by `idempotencyKey`: a retried request with the same key
 * returns the already-captured (or already-failed) `Payment` instead of
 * calling the gateway again — the pre-check below covers the common case,
 * and the real `@@unique([tenantId, companyId, idempotencyKey])` DB
 * constraint (via `PaymentIdempotencyConflictError`) covers the genuine
 * race between two concurrent first-time requests with the same key
 * (docs/ROADMAP.md §8 exit criteria: "duplicar request no duplica...
 * cargo"). A capture always resolves synchronously to `CAPTURED` or
 * `FAILED` — never throws for a gateway-declined attempt, since a
 * declined payment is itself a valid, recorded outcome the caller needs
 * to see (`payment.status === "FAILED"`), not an exception. `wasReplayed`
 * on the result lets the presentation layer skip auditing a replay as if
 * it were a new capture (a real bug found and fixed during this module's
 * own manual smoke test: every retried capture was writing a second
 * `payments.payment.captured` audit entry for the same real charge).
 */
@Injectable()
export class CapturePaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(PAYMENT_GATEWAYS) private readonly gateways: PaymentGateway[],
    private readonly getSalesOrder: GetSalesOrderUseCase,
  ) {}

  async execute(input: CapturePaymentInput): Promise<CapturePaymentResult> {
    const existing = await this.payments.findByIdempotencyKey(input.tenantId, input.companyId, input.idempotencyKey);
    if (existing) {
      return { payment: existing, wasReplayed: true };
    }

    const order = await this.getSalesOrder.execute(input.tenantId, input.salesOrderId);
    if (!order || order.companyId !== input.companyId) {
      throw new PaymentSalesOrderNotFoundError();
    }
    const currency = input.currency.trim().toUpperCase();
    if (currency !== order.currency) {
      throw new PaymentCurrencyMismatchError();
    }

    const gateway = this.resolveGateway(input.method);
    const result = await gateway.capture({ amount: input.amount, currency, reference: input.reference });

    const now = new Date();
    const payment = Payment.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      salesOrderId: order.id,
      method: input.method,
      status: result.success ? "CAPTURED" : "FAILED",
      amount: input.amount,
      currency,
      idempotencyKey: input.idempotencyKey,
      gatewayReference: result.gatewayReference,
      failureReason: result.failureReason,
      createdAt: now,
      capturedAt: result.success ? now : null,
      refundedAt: null,
    });

    try {
      await this.payments.save(payment);
    } catch (error) {
      if (error instanceof PaymentIdempotencyConflictError) {
        const winner = await this.payments.findByIdempotencyKey(input.tenantId, input.companyId, input.idempotencyKey);
        if (winner) {
          return { payment: winner, wasReplayed: true };
        }
      }
      throw error;
    }
    return { payment, wasReplayed: false };
  }

  private resolveGateway(method: PaymentMethod): PaymentGateway {
    const gateway = this.gateways.find((g) => g.method === method);
    if (!gateway) {
      throw new Error(`No payment gateway registered for method ${method}.`);
    }
    return gateway;
  }
}
