import { InventoryBalance } from "./inventory-balance.entity";

describe("InventoryBalance", () => {
  it("computes availableQuantity as onHand - reserved", () => {
    const balance = InventoryBalance.create({
      id: "balance-1",
      tenantId: "tenant-1",
      companyId: "company-1",
      warehouseId: "warehouse-1",
      productId: "product-1",
      productVariantId: null,
      onHandQuantity: "100.0000",
      reservedQuantity: "35.0000",
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(balance.availableQuantity).toBe("65.0000");
  });

  it("never persists availableQuantity — it is always derived", () => {
    const balance = InventoryBalance.create({
      id: "balance-1",
      tenantId: "tenant-1",
      companyId: "company-1",
      warehouseId: "warehouse-1",
      productId: "product-1",
      productVariantId: null,
      onHandQuantity: "10.0000",
      reservedQuantity: "10.0000",
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(balance.availableQuantity).toBe("0.0000");
    expect(balance.toProps()).not.toHaveProperty("availableQuantity");
  });
});
