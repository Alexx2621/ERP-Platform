import { PosSale, PosSaleProps } from "./pos-sale.entity";

function buildProps(overrides: Partial<PosSaleProps> = {}): PosSaleProps {
  return {
    id: "pos-sale-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    shiftId: "shift-1",
    salesOrderId: "order-1",
    paymentId: "payment-1",
    idempotencyKey: "  terminal-1:txn-1  ",
    paymentMethod: "CASH",
    amount: "42.5000",
    amountTendered: "50.0000",
    changeDue: "7.5000",
    createdAt: new Date("2026-09-01T10:00:00.000Z"),
    ...overrides,
  };
}

describe("PosSale", () => {
  it("trims the idempotency key", () => {
    const sale = PosSale.create(buildProps());
    expect(sale.idempotencyKey).toBe("terminal-1:txn-1");
  });

  it("rejects a blank idempotency key", () => {
    expect(() => PosSale.create(buildProps({ idempotencyKey: "   " }))).toThrow(/idempotencyKey must not be empty/);
  });

  it("rejects a non-positive amount", () => {
    expect(() => PosSale.create(buildProps({ amount: "0" }))).toThrow(/must be a positive decimal/);
  });

  it("allows no tendered/change for a non-cash method", () => {
    const sale = PosSale.create(buildProps({ paymentMethod: "BANK_TRANSFER", amountTendered: null, changeDue: null }));
    expect(sale.amountTendered).toBeNull();
    expect(sale.changeDue).toBeNull();
  });
});
