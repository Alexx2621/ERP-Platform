import { PurchaseOrderLine, PurchaseOrderLineInput } from "./purchase-order-line.entity";

function buildInput(overrides: Partial<PurchaseOrderLineInput> = {}): PurchaseOrderLineInput {
  return {
    id: "line-1",
    tenantId: "tenant-1",
    purchaseOrderId: "order-1",
    warehouseId: "warehouse-1",
    productId: "product-1",
    productVariantId: null,
    quantity: "10",
    unitCost: "5.5",
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("PurchaseOrderLine", () => {
  it("computes lineTotal as quantity times unitCost", () => {
    const line = PurchaseOrderLine.create(buildInput({ quantity: "10", unitCost: "5.5" }));
    expect(line.lineTotal).toBe("55.0000");
  });

  it("rejects a zero quantity", () => {
    expect(() => PurchaseOrderLine.create(buildInput({ quantity: "0" }))).toThrow(/must be a positive decimal/);
  });

  it("accepts a zero unitCost (free sample goods)", () => {
    const line = PurchaseOrderLine.create(buildInput({ unitCost: "0" }));
    expect(line.lineTotal).toBe("0.0000");
  });

  it("allows a null warehouseId for a non-tracked product", () => {
    const line = PurchaseOrderLine.create(buildInput({ warehouseId: null }));
    expect(line.warehouseId).toBeNull();
  });

  it("fromProps trusts the stored lineTotal without recomputing", () => {
    const line = PurchaseOrderLine.fromProps({
      id: "line-1",
      tenantId: "tenant-1",
      purchaseOrderId: "order-1",
      warehouseId: "warehouse-1",
      productId: "product-1",
      productVariantId: null,
      quantity: "10",
      unitCost: "5.5",
      lineTotal: "999.0000",
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    expect(line.lineTotal).toBe("999.0000");
  });
});
