import { ProductionOrder, ProductionOrderProps } from "./production-order.entity";

function buildProps(overrides: Partial<ProductionOrderProps> = {}): ProductionOrderProps {
  const now = new Date("2026-09-03T00:00:00.000Z");
  return {
    id: "order-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    billOfMaterialId: "bom-1",
    productId: "product-1",
    warehouseId: "warehouse-1",
    quantityPlanned: "10.0000",
    status: "DRAFT",
    version: 1,
    createdAt: now,
    updatedAt: now,
    confirmedAt: null,
    closedAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

describe("ProductionOrder", () => {
  it("rejects a zero quantityPlanned", () => {
    expect(() => ProductionOrder.create(buildProps({ quantityPlanned: "0" }))).toThrow(/positive decimal/);
  });

  it("confirms a DRAFT order", () => {
    const order = ProductionOrder.create(buildProps());
    const now = new Date("2026-09-04T00:00:00.000Z");
    order.confirm(now);
    expect(order.status).toBe("CONFIRMED");
    expect(order.confirmedAt).toBe(now);
    expect(order.version).toBe(2);
  });

  it("rejects confirming a non-DRAFT order", () => {
    const order = ProductionOrder.create(buildProps({ status: "CONFIRMED" }));
    expect(() => order.confirm(new Date())).toThrow(/Cannot confirm a production order in status CONFIRMED/);
  });

  it("closes a CONFIRMED order", () => {
    const order = ProductionOrder.create(buildProps({ status: "CONFIRMED" }));
    const now = new Date("2026-09-05T00:00:00.000Z");
    order.close(now);
    expect(order.status).toBe("CLOSED");
    expect(order.closedAt).toBe(now);
  });

  it("rejects closing a DRAFT order", () => {
    const order = ProductionOrder.create(buildProps({ status: "DRAFT" }));
    expect(() => order.close(new Date())).toThrow(/Cannot close a production order in status DRAFT/);
  });

  it("cancels a DRAFT order", () => {
    const order = ProductionOrder.create(buildProps({ status: "DRAFT" }));
    order.cancel(new Date());
    expect(order.status).toBe("CANCELLED");
  });

  it("cancels a CONFIRMED order", () => {
    const order = ProductionOrder.create(buildProps({ status: "CONFIRMED" }));
    order.cancel(new Date());
    expect(order.status).toBe("CANCELLED");
  });

  it("rejects cancelling a CLOSED order", () => {
    const order = ProductionOrder.create(buildProps({ status: "CLOSED" }));
    expect(() => order.cancel(new Date())).toThrow(/Cannot cancel a production order in status CLOSED/);
  });
});
