import { PosCashMovement, PosCashMovementProps } from "./pos-cash-movement.entity";

function buildProps(overrides: Partial<PosCashMovementProps> = {}): PosCashMovementProps {
  return {
    id: "movement-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    shiftId: "shift-1",
    type: "CASH_IN",
    amount: "25.0000",
    reason: "  Fondo de cambio  ",
    recordedByUserId: "user-1",
    createdAt: new Date("2026-09-01T09:00:00.000Z"),
    ...overrides,
  };
}

describe("PosCashMovement", () => {
  it("trims the reason", () => {
    const movement = PosCashMovement.create(buildProps());
    expect(movement.reason).toBe("Fondo de cambio");
  });

  it("rejects a blank reason", () => {
    expect(() => PosCashMovement.create(buildProps({ reason: "   " }))).toThrow(/requires a reason/);
  });

  it("rejects a non-positive amount", () => {
    expect(() => PosCashMovement.create(buildProps({ amount: "0" }))).toThrow(/must be a positive decimal/);
  });

  it("accepts a CASH_OUT movement", () => {
    const movement = PosCashMovement.create(buildProps({ type: "CASH_OUT", reason: "Depósito a bóveda" }));
    expect(movement.type).toBe("CASH_OUT");
  });
});
