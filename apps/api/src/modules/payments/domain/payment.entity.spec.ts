import { Payment, PaymentProps } from "./payment.entity";

function buildProps(overrides: Partial<PaymentProps> = {}): PaymentProps {
  const now = new Date("2026-09-01T00:00:00.000Z");
  return {
    id: "payment-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    salesOrderId: "order-1",
    method: "CASH",
    status: "CAPTURED",
    amount: "150.5",
    currency: "usd",
    idempotencyKey: " capture-key-1 ",
    gatewayReference: null,
    failureReason: null,
    createdAt: now,
    capturedAt: now,
    refundedAt: null,
    ...overrides,
  };
}

describe("Payment", () => {
  it("normalizes currency to uppercase and trims idempotencyKey", () => {
    const payment = Payment.create(buildProps());
    expect(payment.currency).toBe("USD");
    expect(payment.idempotencyKey).toBe("capture-key-1");
  });

  it("rejects a non-positive amount", () => {
    expect(() => Payment.create(buildProps({ amount: "0" }))).toThrow(/amount must be a positive decimal/);
    expect(() => Payment.create(buildProps({ amount: "-1" }))).toThrow(/amount must be a positive decimal/);
  });

  it("rejects an invalid currency code", () => {
    expect(() => Payment.create(buildProps({ currency: "US" }))).toThrow(/3-letter ISO 4217/);
  });

  it("rejects an empty idempotencyKey", () => {
    expect(() => Payment.create(buildProps({ idempotencyKey: "   " }))).toThrow(/idempotencyKey must not be empty/);
  });

  it("refunds a CAPTURED payment", () => {
    const payment = Payment.create(buildProps());
    const now = new Date("2026-09-02T00:00:00.000Z");
    payment.refund(now);
    expect(payment.status).toBe("REFUNDED");
    expect(payment.refundedAt).toBe(now);
  });

  it("rejects refunding a FAILED payment", () => {
    const payment = Payment.create(buildProps({ status: "FAILED", capturedAt: null, failureReason: "declined" }));
    expect(() => payment.refund(new Date())).toThrow(/Cannot refund a payment in status FAILED/);
  });

  it("rejects refunding an already-REFUNDED payment", () => {
    const payment = Payment.create(buildProps({ status: "REFUNDED", refundedAt: new Date() }));
    expect(() => payment.refund(new Date())).toThrow(/Cannot refund a payment in status REFUNDED/);
  });

  it("allows a FAILED payment to carry a failureReason and no capturedAt", () => {
    const payment = Payment.create(buildProps({ status: "FAILED", capturedAt: null, failureReason: "Card declined" }));
    expect(payment.status).toBe("FAILED");
    expect(payment.capturedAt).toBeNull();
    expect(payment.failureReason).toBe("Card declined");
  });
});
