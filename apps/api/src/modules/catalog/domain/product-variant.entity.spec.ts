import { ProductVariant } from "./product-variant.entity";

const base = {
  id: "v1",
  tenantId: "t1",
  productId: "p1",
  barcode: null,
  status: "ACTIVE" as const,
  version: 1,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("ProductVariant", () => {
  it("requires at least one attribute", () => {
    expect(() =>
      ProductVariant.create({ ...base, sku: "SKU-1-BLU", attributes: {}, price: "10.00", cost: null }),
    ).toThrow();
  });

  it("rejects a malformed price", () => {
    expect(() =>
      ProductVariant.create({
        ...base,
        sku: "SKU-1-BLU",
        attributes: { color: "Azul" },
        price: "abc",
        cost: null,
      }),
    ).toThrow();
  });

  it("reprice() bumps version", () => {
    const variant = ProductVariant.create({
      ...base,
      sku: "SKU-1-BLU",
      attributes: { color: "Azul" },
      price: "10.00",
      cost: null,
    });
    variant.reprice("12.50", "6.00");
    expect(variant.price).toBe("12.50");
    expect(variant.cost).toBe("6.00");
    expect(variant.version).toBe(2);
  });

  it("toProps() returns a defensive copy of attributes", () => {
    const variant = ProductVariant.create({
      ...base,
      sku: "SKU-1-BLU",
      attributes: { color: "Azul" },
      price: "10.00",
      cost: null,
    });
    const props = variant.toProps();
    props.attributes.color = "Rojo";
    expect(variant.attributes.color).toBe("Azul");
  });
});
