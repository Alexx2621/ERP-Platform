import { PosReturn, PosReturnProps } from "./pos-return.entity";

function buildProps(overrides: Partial<PosReturnProps> = {}): PosReturnProps {
  return {
    id: "pos-return-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    shiftId: "shift-1",
    posSaleId: "pos-sale-1",
    salesReturnId: "sales-return-1",
    idempotencyKey: "  terminal-1:ret-1  ",
    refunded: false,
    refundAmount: null,
    refundMethod: null,
    reason: "  Producto defectuoso  ",
    createdAt: new Date("2026-09-01T11:00:00.000Z"),
    ...overrides,
  };
}

describe("PosReturn", () => {
  it("trims the idempotency key and reason", () => {
    const posReturn = PosReturn.create(buildProps());
    expect(posReturn.idempotencyKey).toBe("terminal-1:ret-1");
    expect(posReturn.reason).toBe("Producto defectuoso");
  });

  it("rejects a blank idempotency key", () => {
    expect(() => PosReturn.create(buildProps({ idempotencyKey: "   " }))).toThrow(/idempotencyKey must not be empty/);
  });

  it("allows no reason", () => {
    const posReturn = PosReturn.create(buildProps({ reason: null }));
    expect(posReturn.reason).toBeNull();
  });

  it("carries the refund snapshot when refunded", () => {
    const posReturn = PosReturn.create(
      buildProps({ refunded: true, refundAmount: "42.5000", refundMethod: "CASH" }),
    );
    expect(posReturn.refunded).toBe(true);
    expect(posReturn.refundAmount).toBe("42.5000");
    expect(posReturn.refundMethod).toBe("CASH");
  });
});
