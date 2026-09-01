import { PurchaseOrder, PurchaseOrderProps } from "./purchase-order.entity";

function buildProps(overrides: Partial<PurchaseOrderProps> = {}): PurchaseOrderProps {
  const now = new Date("2026-09-01T00:00:00.000Z");
  return {
    id: "order-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    supplierId: "supplier-1",
    status: "DRAFT",
    currency: "usd",
    notes: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    confirmedAt: null,
    closedAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

describe("PurchaseOrder", () => {
  it("normalizes currency to uppercase", () => {
    const order = PurchaseOrder.create(buildProps());
    expect(order.currency).toBe("USD");
  });

  it("rejects an invalid currency code", () => {
    expect(() => PurchaseOrder.create(buildProps({ currency: "US" }))).toThrow(/3-letter ISO 4217/);
  });

  it("trims notes to null when blank", () => {
    const order = PurchaseOrder.create(buildProps({ notes: "   " }));
    expect(order.notes).toBeNull();
  });

  it("confirms a DRAFT order", () => {
    const order = PurchaseOrder.create(buildProps());
    const now = new Date("2026-09-02T00:00:00.000Z");
    order.confirm(now);
    expect(order.status).toBe("CONFIRMED");
    expect(order.confirmedAt).toBe(now);
    expect(order.version).toBe(2);
  });

  it("rejects confirming a non-DRAFT order", () => {
    const order = PurchaseOrder.create(buildProps({ status: "CONFIRMED" }));
    expect(() => order.confirm(new Date())).toThrow(/Cannot confirm a purchase order in status CONFIRMED/);
  });

  it("closes a CONFIRMED order", () => {
    const order = PurchaseOrder.create(buildProps({ status: "CONFIRMED" }));
    const now = new Date("2026-09-03T00:00:00.000Z");
    order.close(now);
    expect(order.status).toBe("CLOSED");
    expect(order.closedAt).toBe(now);
  });

  it("rejects closing a DRAFT order", () => {
    const order = PurchaseOrder.create(buildProps({ status: "DRAFT" }));
    expect(() => order.close(new Date())).toThrow(/Cannot close a purchase order in status DRAFT/);
  });

  it("cancels a DRAFT order", () => {
    const order = PurchaseOrder.create(buildProps({ status: "DRAFT" }));
    order.cancel(new Date());
    expect(order.status).toBe("CANCELLED");
  });

  it("cancels a CONFIRMED order", () => {
    const order = PurchaseOrder.create(buildProps({ status: "CONFIRMED" }));
    order.cancel(new Date());
    expect(order.status).toBe("CANCELLED");
  });

  it("rejects cancelling a CLOSED order", () => {
    const order = PurchaseOrder.create(buildProps({ status: "CLOSED" }));
    expect(() => order.cancel(new Date())).toThrow(/Cannot cancel a purchase order in status CLOSED/);
  });

  it("rejects cancelling an already-CANCELLED order", () => {
    const order = PurchaseOrder.create(buildProps({ status: "CANCELLED" }));
    expect(() => order.cancel(new Date())).toThrow(/Cannot cancel a purchase order in status CANCELLED/);
  });
});
