import type { PaymentMethod } from "../../domain/payment.entity";

export const PAYMENT_GATEWAYS = Symbol("PAYMENT_GATEWAYS");

export interface PaymentGatewayCaptureInput {
  amount: string;
  currency: string;
  /** A caller-supplied reference to reconcile against later (e.g. a bank transfer confirmation number). Cash has none. */
  reference?: string | null;
}

export interface PaymentGatewayRefundInput {
  amount: string;
  currency: string;
  gatewayReference: string | null;
}

export interface PaymentGatewayResult {
  success: boolean;
  gatewayReference: string | null;
  failureReason: string | null;
}

/**
 * MASTER_SPEC §22's `PaymentGateway` contract (`createPayment`/
 * `capturePayment`/`refundPayment`, collapsed to `capture`/`refund` since
 * this slice's two adapters never separate authorize-then-capture).
 * `CashPaymentGatewayAdapter`/`BankTransferPaymentGatewayAdapter` are the
 * only implementations — see `docs/DECISIONS.md` for why no
 * credential-requiring provider is faked here. Both are synchronous and
 * always terminal: no `verifyPayment()`/`handleWebhook()` in this slice,
 * since neither method has an asynchronous confirmation step to reconcile.
 */
export interface PaymentGateway {
  readonly method: PaymentMethod;
  capture(input: PaymentGatewayCaptureInput): Promise<PaymentGatewayResult>;
  refund(input: PaymentGatewayRefundInput): Promise<PaymentGatewayResult>;
}
