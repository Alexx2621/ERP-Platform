import { PosShift, PosShiftProps } from "./pos-shift.entity";

function buildProps(overrides: Partial<PosShiftProps> = {}): PosShiftProps {
  const now = new Date("2026-09-01T08:00:00.000Z");
  return {
    id: "shift-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    registerId: "register-1",
    status: "OPEN",
    openedByUserId: "user-1",
    openedAt: now,
    openingCash: "50",
    closedByUserId: null,
    closedAt: null,
    closingCashCounted: null,
    closingCashExpected: null,
    cashVariance: null,
    notes: null,
    ...overrides,
  };
}

describe("PosShift", () => {
  it("allows opening with zero cash", () => {
    const shift = PosShift.open(buildProps({ openingCash: "0" }));
    expect(shift.openingCash).toBe("0");
  });

  it("rejects a negative opening cash", () => {
    expect(() => PosShift.open(buildProps({ openingCash: "-10" }))).toThrow(/openingCash must be a non-negative/);
  });

  it("closes an OPEN shift and computes a positive variance", () => {
    const shift = PosShift.open(buildProps());
    const now = new Date("2026-09-01T20:00:00.000Z");
    shift.close(now, "user-2", "150.0000", "140.0000");
    expect(shift.status).toBe("CLOSED");
    expect(shift.closedAt).toBe(now);
    expect(shift.closedByUserId).toBe("user-2");
    expect(shift.closingCashCounted).toBe("150.0000");
    expect(shift.closingCashExpected).toBe("140.0000");
    expect(shift.cashVariance).toBe("10.0000");
  });

  it("computes a negative variance when counted cash is short", () => {
    const shift = PosShift.open(buildProps());
    shift.close(new Date(), "user-2", "90.0000", "100.0000");
    expect(shift.cashVariance).toBe("-10.0000");
  });

  it("computes a zero variance when counted cash matches expected", () => {
    const shift = PosShift.open(buildProps());
    shift.close(new Date(), "user-2", "100.0000", "100.0000");
    expect(shift.cashVariance).toBe("0.0000");
  });

  it("rejects closing an already-CLOSED shift", () => {
    const shift = PosShift.open(buildProps());
    shift.close(new Date(), "user-2", "50", "50");
    expect(() => shift.close(new Date(), "user-2", "50", "50")).toThrow(/Cannot close a shift in status CLOSED/);
  });
});
