import { Injectable } from "@nestjs/common";
import {
  PaymentGateway,
  PaymentGatewayCaptureInput,
  PaymentGatewayRefundInput,
  PaymentGatewayResult,
} from "../application/ports/payment-gateway.port";

/**
 * Recording a cash payment/refund is a bookkeeping act, not a call to an
 * external processor that could decline — there is nothing to verify
 * against, so every attempt succeeds. No `gatewayReference`: cash has no
 * external transaction id to reconcile against later.
 */
@Injectable()
export class CashPaymentGatewayAdapter implements PaymentGateway {
  readonly method = "CASH" as const;

  async capture(_input: PaymentGatewayCaptureInput): Promise<PaymentGatewayResult> {
    return { success: true, gatewayReference: null, failureReason: null };
  }

  async refund(_input: PaymentGatewayRefundInput): Promise<PaymentGatewayResult> {
    return { success: true, gatewayReference: null, failureReason: null };
  }
}
