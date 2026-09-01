import { InMemoryCustomerRepository } from "../../../customers/test-support/in-memory-customer.repository";
import { CreateCustomerUseCase } from "../../../customers/application/use-cases/create-customer.use-case";
import { InMemorySalesOrderRepository } from "../../../sales/test-support/in-memory-sales-order.repository";
import { ResolveCustomerTargetUseCase } from "../../../sales/application/use-cases/resolve-customer-target.use-case";
import { CreateSalesOrderUseCase } from "../../../sales/application/use-cases/create-sales-order.use-case";
import { GetSalesOrderUseCase } from "../../../sales/application/use-cases/get-sales-order.use-case";
import { GetCustomerUseCase } from "../../../customers";
import { InMemoryPaymentRepository } from "../../test-support/in-memory-payment.repository";
import { CashPaymentGatewayAdapter } from "../../infrastructure/cash-payment-gateway.adapter";
import { BankTransferPaymentGatewayAdapter } from "../../infrastructure/bank-transfer-payment-gateway.adapter";
import { CapturePaymentUseCase } from "./capture-payment.use-case";
import { RefundPaymentUseCase } from "./refund-payment.use-case";
import { ListPaymentsUseCase } from "./list-payments.use-case";
import { PaymentGateway } from "../ports/payment-gateway.port";
import {
  PaymentCurrencyMismatchError,
  PaymentIdempotencyConflictError,
  PaymentNotCapturedError,
  PaymentNotFoundError,
  PaymentRefundFailedError,
  PaymentSalesOrderNotFoundError,
} from "../errors";

const TENANT_ID = "tenant-1";
const COMPANY_ID = "company-1";
const OTHER_COMPANY_ID = "company-2";

async function buildContext(gateways?: PaymentGateway[]) {
  const customers = new InMemoryCustomerRepository();
  const createCustomer = new CreateCustomerUseCase(customers);
  const getCustomer = new GetCustomerUseCase(customers);
  const customer = await createCustomer.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, code: "CUST-1", name: "Cliente 1" });
  const otherCompanyCustomer = await createCustomer.execute({
    tenantId: TENANT_ID,
    companyId: OTHER_COMPANY_ID,
    code: "CUST-1",
    name: "Cliente de otra empresa",
  });

  const salesOrders = new InMemorySalesOrderRepository();
  const resolveCustomerTarget = new ResolveCustomerTargetUseCase(getCustomer);
  const createSalesOrder = new CreateSalesOrderUseCase(salesOrders, resolveCustomerTarget);
  const getSalesOrder = new GetSalesOrderUseCase(salesOrders);

  const order = await createSalesOrder.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, customerId: customer.id, currency: "USD" });
  const otherCompanyOrder = await createSalesOrder.execute({
    tenantId: TENANT_ID,
    companyId: OTHER_COMPANY_ID,
    customerId: otherCompanyCustomer.id,
    currency: "USD",
  });

  const payments = new InMemoryPaymentRepository();
  const resolvedGateways = gateways ?? [new CashPaymentGatewayAdapter(), new BankTransferPaymentGatewayAdapter()];

  return {
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    otherCompanyId: OTHER_COMPANY_ID,
    order,
    otherCompanyOrder,
    payments,
    capturePayment: new CapturePaymentUseCase(payments, resolvedGateways, getSalesOrder),
    refundPayment: new RefundPaymentUseCase(payments, resolvedGateways),
    listPayments: new ListPaymentsUseCase(payments),
  };
}

describe("CapturePaymentUseCase", () => {
  it("captures a CASH payment synchronously with no gateway reference", async () => {
    const ctx = await buildContext();
    const { payment, wasReplayed } = await ctx.capturePayment.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: ctx.order.id,
      method: "CASH",
      amount: "150.0000",
      currency: "usd",
      idempotencyKey: "cap-1",
    });
    expect(payment.status).toBe("CAPTURED");
    expect(payment.method).toBe("CASH");
    expect(payment.currency).toBe("USD");
    expect(payment.gatewayReference).toBeNull();
    expect(payment.capturedAt).not.toBeNull();
    expect(wasReplayed).toBe(false);
  });

  it("captures a BANK_TRANSFER payment when a reference is provided", async () => {
    const ctx = await buildContext();
    const { payment } = await ctx.capturePayment.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: ctx.order.id,
      method: "BANK_TRANSFER",
      amount: "150.0000",
      currency: "USD",
      idempotencyKey: "cap-2",
      reference: "TRX-998877",
    });
    expect(payment.status).toBe("CAPTURED");
    expect(payment.gatewayReference).toBe("TRX-998877");
  });

  it("records a FAILED payment (not a thrown error) when BANK_TRANSFER has no reference", async () => {
    const ctx = await buildContext();
    const { payment } = await ctx.capturePayment.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: ctx.order.id,
      method: "BANK_TRANSFER",
      amount: "150.0000",
      currency: "USD",
      idempotencyKey: "cap-3",
    });
    expect(payment.status).toBe("FAILED");
    expect(payment.capturedAt).toBeNull();
    expect(payment.failureReason).toBe("A bank transfer reference is required.");
  });

  it("rejects a sales order that does not exist", async () => {
    const ctx = await buildContext();
    await expect(
      ctx.capturePayment.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        salesOrderId: "missing",
        method: "CASH",
        amount: "10.0000",
        currency: "USD",
        idempotencyKey: "cap-4",
      }),
    ).rejects.toThrow(PaymentSalesOrderNotFoundError);
  });

  it("rejects a sales order belonging to a different company", async () => {
    const ctx = await buildContext();
    await expect(
      ctx.capturePayment.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        salesOrderId: ctx.otherCompanyOrder.id,
        method: "CASH",
        amount: "10.0000",
        currency: "USD",
        idempotencyKey: "cap-5",
      }),
    ).rejects.toThrow(PaymentSalesOrderNotFoundError);
  });

  it("rejects a currency that does not match the sales order's currency", async () => {
    const ctx = await buildContext();
    await expect(
      ctx.capturePayment.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        salesOrderId: ctx.order.id,
        method: "CASH",
        amount: "10.0000",
        currency: "EUR",
        idempotencyKey: "cap-6",
      }),
    ).rejects.toThrow(PaymentCurrencyMismatchError);
  });

  it("is idempotent: a retried request with the same idempotencyKey returns the original payment without calling the gateway again", async () => {
    const captureSpy = jest.fn(async () => ({ success: true, gatewayReference: null, failureReason: null }));
    const fakeCashGateway: PaymentGateway = {
      method: "CASH",
      capture: captureSpy,
      refund: async () => ({ success: true, gatewayReference: null, failureReason: null }),
    };
    const ctx = await buildContext([fakeCashGateway]);

    const first = await ctx.capturePayment.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: ctx.order.id,
      method: "CASH",
      amount: "150.0000",
      currency: "USD",
      idempotencyKey: "retry-key",
    });
    const second = await ctx.capturePayment.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: ctx.order.id,
      method: "CASH",
      amount: "150.0000",
      currency: "USD",
      idempotencyKey: "retry-key",
    });

    expect(first.wasReplayed).toBe(false);
    expect(second.wasReplayed).toBe(true);
    expect(second.payment.id).toBe(first.payment.id);
    expect(captureSpy).toHaveBeenCalledTimes(1);

    const all = await ctx.listPayments.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(all).toHaveLength(1); // never duplicated
  });

  it("reacts to a PaymentIdempotencyConflictError raised by the repository's save() by re-fetching and returning the winner", async () => {
    // A real concurrent race (two processes racing the real Postgres unique
    // constraint) cannot be reliably reproduced against the in-memory
    // repository — single-threaded JS interleaving is not equivalent to a
    // genuine concurrent-transaction race, same reasoning already
    // documented on InMemoryInventoryBalanceRepository ("real concurrency
    // is verified against actual Postgres in the integration suite, not
    // here"). This test instead verifies CapturePaymentUseCase's own
    // reaction contract directly with a fake repository that reproduces
    // what a real race looks like from the use case's point of view: the
    // pre-check finds nothing (the winner hasn't committed yet), save()
    // then fails with PaymentIdempotencyConflictError (the real unique
    // violation, translated by PrismaPaymentRepository per
    // docs/ARCHITECTURE.md §6), and the post-conflict re-fetch finds the
    // winner's row (now committed).
    const ctx = await buildContext();
    const { payment: winner } = await ctx.capturePayment.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: ctx.order.id,
      method: "CASH",
      amount: "150.0000",
      currency: "USD",
      idempotencyKey: "race-key-winner",
    });

    let findByIdempotencyKeyCalls = 0;
    const raceSimulatingRepository = {
      findById: async () => null,
      findByIdempotencyKey: async () => {
        findByIdempotencyKeyCalls += 1;
        return findByIdempotencyKeyCalls === 1 ? null : winner;
      },
      listByCompany: async () => [],
      save: async () => {
        throw new PaymentIdempotencyConflictError();
      },
    };
    const capturePaymentUnderRace = new CapturePaymentUseCase(
      raceSimulatingRepository,
      [new CashPaymentGatewayAdapter(), new BankTransferPaymentGatewayAdapter()],
      new GetSalesOrderUseCase({ findById: async () => ctx.order } as never),
    );

    const loserResult = await capturePaymentUnderRace.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: ctx.order.id,
      method: "CASH",
      amount: "150.0000",
      currency: "USD",
      idempotencyKey: "race-key-winner",
    });
    expect(loserResult.payment.id).toBe(winner.id);
    expect(loserResult.wasReplayed).toBe(true);
    expect(findByIdempotencyKeyCalls).toBe(2); // the pre-check, then the post-conflict re-fetch
  });
});

describe("RefundPaymentUseCase", () => {
  it("refunds a CAPTURED payment", async () => {
    const ctx = await buildContext();
    const { payment: captured } = await ctx.capturePayment.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: ctx.order.id,
      method: "CASH",
      amount: "150.0000",
      currency: "USD",
      idempotencyKey: "cap-refund-1",
    });
    const refunded = await ctx.refundPayment.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, paymentId: captured.id });
    expect(refunded.status).toBe("REFUNDED");
    expect(refunded.refundedAt).not.toBeNull();
  });

  it("rejects refunding a payment that does not exist", async () => {
    const ctx = await buildContext();
    await expect(ctx.refundPayment.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, paymentId: "missing" })).rejects.toThrow(
      PaymentNotFoundError,
    );
  });

  it("rejects refunding a payment from a different company", async () => {
    const ctx = await buildContext();
    const { payment: captured } = await ctx.capturePayment.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: ctx.order.id,
      method: "CASH",
      amount: "150.0000",
      currency: "USD",
      idempotencyKey: "cap-refund-2",
    });
    await expect(
      ctx.refundPayment.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, paymentId: captured.id }),
    ).rejects.toThrow(PaymentNotFoundError);
  });

  it("rejects refunding a FAILED payment", async () => {
    const ctx = await buildContext();
    const { payment: failed } = await ctx.capturePayment.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: ctx.order.id,
      method: "BANK_TRANSFER",
      amount: "150.0000",
      currency: "USD",
      idempotencyKey: "cap-refund-3",
    });
    expect(failed.status).toBe("FAILED");
    await expect(ctx.refundPayment.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, paymentId: failed.id })).rejects.toThrow(
      PaymentNotCapturedError,
    );
  });

  it("rejects refunding an already-REFUNDED payment", async () => {
    const ctx = await buildContext();
    const { payment: captured } = await ctx.capturePayment.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: ctx.order.id,
      method: "CASH",
      amount: "150.0000",
      currency: "USD",
      idempotencyKey: "cap-refund-4",
    });
    await ctx.refundPayment.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, paymentId: captured.id });
    await expect(
      ctx.refundPayment.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, paymentId: captured.id }),
    ).rejects.toThrow(PaymentNotCapturedError);
  });

  it("propagates a gateway-declined refund as PaymentRefundFailedError, leaving the payment CAPTURED", async () => {
    const decliningGateway: PaymentGateway = {
      method: "CASH",
      capture: async () => ({ success: true, gatewayReference: null, failureReason: null }),
      refund: async () => ({ success: false, gatewayReference: null, failureReason: "Refund window expired." }),
    };
    const ctx = await buildContext([decliningGateway]);
    const { payment: captured } = await ctx.capturePayment.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: ctx.order.id,
      method: "CASH",
      amount: "150.0000",
      currency: "USD",
      idempotencyKey: "cap-refund-5",
    });
    await expect(
      ctx.refundPayment.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, paymentId: captured.id }),
    ).rejects.toThrow(PaymentRefundFailedError);

    const reloaded = await ctx.listPayments.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(reloaded.find((p) => p.id === captured.id)!.status).toBe("CAPTURED");
  });
});

describe("ListPaymentsUseCase", () => {
  it("lists payments scoped to a company, optionally filtered by salesOrderId", async () => {
    const ctx = await buildContext();
    await ctx.capturePayment.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      salesOrderId: ctx.order.id,
      method: "CASH",
      amount: "50.0000",
      currency: "USD",
      idempotencyKey: "list-1",
    });
    const all = await ctx.listPayments.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(all).toHaveLength(1);
    const scoped = await ctx.listPayments.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      filter: { salesOrderId: ctx.order.id, limit: 50 },
    });
    expect(scoped).toHaveLength(1);
    const scopedToOther = await ctx.listPayments.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      filter: { salesOrderId: "some-other-order", limit: 50 },
    });
    expect(scopedToOther).toHaveLength(0);
  });
});
