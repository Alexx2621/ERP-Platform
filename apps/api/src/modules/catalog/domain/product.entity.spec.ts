import { Product } from "./product.entity";

const base = {
  id: "p1",
  tenantId: "t1",
  companyId: "c1",
  categoryId: null,
  brandId: null,
  unitOfMeasureId: "uom-1",
  description: null,
  type: "PHYSICAL_GOOD" as const,
  trackInventory: true,
  purchasable: true,
  publishOnline: false,
  barcode: null,
  status: "ACTIVE" as const,
  version: 1,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("Product", () => {
  it("requires a basePrice for a sellable product without variants", () => {
    expect(() =>
      Product.create({
        ...base,
        code: "SKU-1",
        name: "Camisa",
        sellable: true,
        hasVariants: false,
        basePrice: null,
        baseCost: null,
      }),
    ).toThrow();
  });

  it("allows a non-sellable product without a basePrice", () => {
    const product = Product.create({
      ...base,
      code: "SKU-1",
      name: "Camisa",
      sellable: false,
      hasVariants: false,
      basePrice: null,
      baseCost: null,
    });
    expect(product.basePrice).toBeNull();
  });

  it("rejects a hasVariants product that carries its own basePrice", () => {
    expect(() =>
      Product.create({
        ...base,
        code: "SKU-1",
        name: "Camisa",
        sellable: true,
        hasVariants: true,
        basePrice: "10.00",
        baseCost: null,
      }),
    ).toThrow();
  });

  it("rejects a malformed decimal price", () => {
    expect(() =>
      Product.create({
        ...base,
        code: "SKU-1",
        name: "Camisa",
        sellable: true,
        hasVariants: false,
        basePrice: "not-a-number",
        baseCost: null,
      }),
    ).toThrow();
  });

  it("accepts a valid product and update() re-validates the same invariant", () => {
    const product = Product.create({
      ...base,
      code: "SKU-1",
      name: "Camisa",
      sellable: true,
      hasVariants: false,
      basePrice: "19.99",
      baseCost: "9.50",
    });
    expect(product.basePrice).toBe("19.99");

    expect(() =>
      product.update({
        name: "Camisa",
        description: null,
        categoryId: null,
        brandId: null,
        barcode: null,
        basePrice: null,
        baseCost: null,
        trackInventory: true,
        sellable: true,
        purchasable: true,
        publishOnline: false,
      }),
    ).toThrow();
  });
});
