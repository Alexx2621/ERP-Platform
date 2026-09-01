import { Injectable } from "@nestjs/common";
import {
  PaymentGateway,
  PaymentGatewayCaptureInput,
  PaymentGatewayRefundInput,
  PaymentGatewayResult,
} from "../application/ports/payment-gateway.port";

/**
 * A bank transfer has no live processor to call either, but — unlike cash —
 * it does have a real external artifact worth requiring: the transfer
 * confirmation number the payer gives the recipient, without which the
 * payment can never be reconciled against a bank statement later. Rejecting
 * a missing reference is a genuine validation, not a simulated decline.
 */
@Injectable()
export class BankTransferPaymentGatewayAdapter implements PaymentGateway {
  readonly method = "BANK_TRANSFER" as const;

  async capture(input: PaymentGatewayCaptureInput): Promise<PaymentGatewayResult> {
    const reference = input.reference?.trim();
    if (!reference) {
      return { success: false, gatewayReference: null, failureReason: "A bank transfer reference is required." };
    }
    return { success: true, gatewayReference: reference, failureReason: null };
  }

  async refund(_input: PaymentGatewayRefundInput): Promise<PaymentGatewayResult> {
    return { success: true, gatewayReference: null, failureReason: null };
  }
}
