import { SalesOrderLine, SalesOrderLineInput } from "./sales-order-line.entity";

function buildInput(overrides: Partial<SalesOrderLineInput> = {}): SalesOrderLineInput {
  return {
    id: "line-1",
    tenantId: "tenant-1",
    salesOrderId: "order-1",
    warehouseId: "warehouse-1",
    productId: "product-1",
    productVariantId: null,
    taxId: null,
    quantity: "2",
    unitPrice: "25",
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("SalesOrderLine", () => {
  it("computes lineTotal the same way QuoteLine does", () => {
    const line = SalesOrderLine.create(buildInput({ discountAmount: "5", taxRate: "10" }));
    // subtotal = 50 - 5 = 45, tax = 4.5, total = 49.5
    expect(line.lineTotal).toBe("49.5000");
  });

  it("starts with no reservation attached", () => {
    const line = SalesOrderLine.create(buildInput());
    expect(line.reservationId).toBeNull();
  });

  it("attaches a reservation exactly once", () => {
    const line = SalesOrderLine.create(buildInput());
    line.attachReservation("reservation-1");
    expect(line.reservationId).toBe("reservation-1");
  });

  it("rejects attaching a second reservation", () => {
    const line = SalesOrderLine.create(buildInput());
    line.attachReservation("reservation-1");
    expect(() => line.attachReservation("reservation-2")).toThrow(/already has a reservation attached/);
  });

  it("allows a null warehouseId for a non-tracked product", () => {
    const line = SalesOrderLine.create(buildInput({ warehouseId: null }));
    expect(line.warehouseId).toBeNull();
  });

  it("fromProps trusts the stored lineTotal and reservationId without recomputing", () => {
    const line = SalesOrderLine.fromProps({
      id: "line-1",
      tenantId: "tenant-1",
      salesOrderId: "order-1",
      warehouseId: "warehouse-1",
      productId: "product-1",
      productVariantId: null,
      taxId: null,
      quantity: "2",
      unitPrice: "25",
      discountAmount: "0",
      taxRate: "0",
      lineTotal: "50.0000",
      reservationId: "reservation-existing",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    expect(line.lineTotal).toBe("50.0000");
    expect(line.reservationId).toBe("reservation-existing");
  });
});
