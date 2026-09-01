import { SalesOrder, SalesOrderProps } from "./sales-order.entity";

function buildProps(overrides: Partial<SalesOrderProps> = {}): SalesOrderProps {
  const now = new Date("2026-09-01T00:00:00.000Z");
  return {
    id: "order-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    customerId: "customer-1",
    quoteId: null,
    channel: "ERP",
    status: "DRAFT",
    currency: "usd",
    version: 1,
    createdAt: now,
    updatedAt: now,
    confirmedAt: null,
    fulfilledAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

describe("SalesOrder", () => {
  it("normalizes currency to uppercase", () => {
    const order = SalesOrder.create(buildProps());
    expect(order.currency).toBe("USD");
  });

  it("rejects an invalid currency code", () => {
    expect(() => SalesOrder.create(buildProps({ currency: "US" }))).toThrow(/3-letter ISO 4217/);
  });

  it("confirms a DRAFT order", () => {
    const order = SalesOrder.create(buildProps());
    const now = new Date("2026-09-02T00:00:00.000Z");
    order.confirm(now);
    expect(order.status).toBe("CONFIRMED");
    expect(order.confirmedAt).toBe(now);
    expect(order.version).toBe(2);
  });

  it("rejects confirming a non-DRAFT order", () => {
    const order = SalesOrder.create(buildProps({ status: "CONFIRMED" }));
    expect(() => order.confirm(new Date())).toThrow(/Cannot confirm a sales order in status CONFIRMED/);
  });

  it("fulfills a CONFIRMED order", () => {
    const order = SalesOrder.create(buildProps({ status: "CONFIRMED" }));
    const now = new Date("2026-09-03T00:00:00.000Z");
    order.fulfill(now);
    expect(order.status).toBe("FULFILLED");
    expect(order.fulfilledAt).toBe(now);
  });

  it("rejects fulfilling a DRAFT order", () => {
    const order = SalesOrder.create(buildProps({ status: "DRAFT" }));
    expect(() => order.fulfill(new Date())).toThrow(/Cannot fulfill a sales order in status DRAFT/);
  });

  it("cancels a DRAFT order", () => {
    const order = SalesOrder.create(buildProps({ status: "DRAFT" }));
    order.cancel(new Date());
    expect(order.status).toBe("CANCELLED");
  });

  it("cancels a CONFIRMED order", () => {
    const order = SalesOrder.create(buildProps({ status: "CONFIRMED" }));
    order.cancel(new Date());
    expect(order.status).toBe("CANCELLED");
  });

  it("rejects cancelling a FULFILLED order — corrected via a return, not a cancellation", () => {
    const order = SalesOrder.create(buildProps({ status: "FULFILLED" }));
    expect(() => order.cancel(new Date())).toThrow(/Cannot cancel a sales order in status FULFILLED/);
  });

  it("rejects cancelling an already-CANCELLED order", () => {
    const order = SalesOrder.create(buildProps({ status: "CANCELLED" }));
    expect(() => order.cancel(new Date())).toThrow(/Cannot cancel a sales order in status CANCELLED/);
  });
});
