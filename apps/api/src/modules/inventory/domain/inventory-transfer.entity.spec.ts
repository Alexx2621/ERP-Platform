import { InventoryTransfer, InventoryTransferProps } from "./inventory-transfer.entity";

function baseProps(overrides: Partial<InventoryTransferProps> = {}): InventoryTransferProps {
  return {
    id: "transfer-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    productId: "product-1",
    productVariantId: null,
    sourceWarehouseId: "warehouse-1",
    destinationWarehouseId: "warehouse-2",
    quantity: "10.0000",
    status: "IN_TRANSIT",
    version: 1,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    completedAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

describe("InventoryTransfer", () => {
  it("rejects a transfer between the same warehouse", () => {
    expect(() =>
      InventoryTransfer.create(baseProps({ sourceWarehouseId: "warehouse-1", destinationWarehouseId: "warehouse-1" })),
    ).toThrow(/must be different/);
  });

  it("rejects a non-positive quantity", () => {
    expect(() => InventoryTransfer.create(baseProps({ quantity: "0.0000" }))).toThrow();
    expect(() => InventoryTransfer.create(baseProps({ quantity: "-5.0000" }))).toThrow();
  });

  it("completes an IN_TRANSIT transfer", () => {
    const transfer = InventoryTransfer.create(baseProps());
    const now = new Date("2026-01-02T00:00:00Z");
    transfer.complete(now);
    expect(transfer.status).toBe("COMPLETED");
    expect(transfer.completedAt).toBe(now);
    expect(transfer.version).toBe(2);
  });

  it("cancels an IN_TRANSIT transfer", () => {
    const transfer = InventoryTransfer.create(baseProps());
    const now = new Date("2026-01-02T00:00:00Z");
    transfer.cancel(now);
    expect(transfer.status).toBe("CANCELLED");
    expect(transfer.cancelledAt).toBe(now);
  });

  it("rejects completing a transfer that is not IN_TRANSIT", () => {
    const transfer = InventoryTransfer.create(baseProps({ status: "COMPLETED" }));
    expect(() => transfer.complete(new Date())).toThrow(/Cannot complete/);
  });

  it("rejects cancelling a transfer that is not IN_TRANSIT", () => {
    const transfer = InventoryTransfer.create(baseProps({ status: "CANCELLED" }));
    expect(() => transfer.cancel(new Date())).toThrow(/Cannot cancel/);
  });
});
