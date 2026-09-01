import { Inject, Injectable } from "@nestjs/common";
import { Payment, PaymentMethod } from "../../domain/payment.entity";
import { PAYMENT_REPOSITORY, PaymentRepository } from "../../domain/payment.repository";
import { PAYMENT_GATEWAYS, PaymentGateway } from "../ports/payment-gateway.port";
import { PaymentNotCapturedError, PaymentNotFoundError, PaymentRefundFailedError } from "../errors";

export interface RefundPaymentInput {
  tenantId: string;
  companyId: string;
  paymentId: string;
}

@Injectable()
export class RefundPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(PAYMENT_GATEWAYS) private readonly gateways: PaymentGateway[],
  ) {}

  async execute(input: RefundPaymentInput): Promise<Payment> {
    const payment = await this.payments.findById(input.tenantId, input.paymentId);
    if (!payment || payment.companyId !== input.companyId) {
      throw new PaymentNotFoundError();
    }
    if (payment.status !== "CAPTURED") {
      throw new PaymentNotCapturedError();
    }

    const gateway = this.resolveGateway(payment.method);
    const result = await gateway.refund({
      amount: payment.amount,
      currency: payment.currency,
      gatewayReference: payment.gatewayReference,
    });
    if (!result.success) {
      throw new PaymentRefundFailedError(result.failureReason ?? "Unknown gateway failure.");
    }

    payment.refund(new Date());
    await this.payments.save(payment);
    return payment;
  }

  private resolveGateway(method: PaymentMethod): PaymentGateway {
    const gateway = this.gateways.find((g) => g.method === method);
    if (!gateway) {
      throw new Error(`No payment gateway registered for method ${method}.`);
    }
    return gateway;
  }
}
