import { InventoryReservation, InventoryReservationProps } from "./inventory-reservation.entity";

function baseProps(overrides: Partial<InventoryReservationProps> = {}): InventoryReservationProps {
  return {
    id: "reservation-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    warehouseId: "warehouse-1",
    productId: "product-1",
    productVariantId: null,
    quantity: "10.0000",
    status: "ACTIVE",
    referenceType: null,
    referenceId: null,
    version: 1,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    releasedAt: null,
    ...overrides,
  };
}

describe("InventoryReservation", () => {
  it("rejects a non-positive quantity", () => {
    expect(() => InventoryReservation.create(baseProps({ quantity: "0.0000" }))).toThrow();
    expect(() => InventoryReservation.create(baseProps({ quantity: "-1.0000" }))).toThrow();
  });

  it("releases an ACTIVE reservation", () => {
    const reservation = InventoryReservation.create(baseProps());
    const now = new Date("2026-01-02T00:00:00Z");
    reservation.release(now);
    expect(reservation.status).toBe("RELEASED");
    expect(reservation.releasedAt).toBe(now);
    expect(reservation.version).toBe(2);
  });

  it("rejects releasing a reservation that is not ACTIVE", () => {
    const reservation = InventoryReservation.create(baseProps({ status: "RELEASED" }));
    expect(() => reservation.release(new Date())).toThrow(/Cannot release/);
  });
});
