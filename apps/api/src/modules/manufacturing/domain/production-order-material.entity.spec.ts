import { ProductionOrderMaterial, ProductionOrderMaterialProps } from "./production-order-material.entity";

function buildProps(overrides: Partial<ProductionOrderMaterialProps> = {}): ProductionOrderMaterialProps {
  return {
    id: "material-1",
    tenantId: "tenant-1",
    productionOrderId: "order-1",
    componentProductId: "product-2",
    componentVariantId: null,
    quantityRequired: "20.0000",
    createdAt: new Date("2026-09-03T00:00:00.000Z"),
    ...overrides,
  };
}

describe("ProductionOrderMaterial", () => {
  it("accepts a positive quantityRequired", () => {
    const material = ProductionOrderMaterial.create(buildProps());
    expect(material.quantityRequired).toBe("20.0000");
  });

  it("rejects a zero quantityRequired", () => {
    expect(() => ProductionOrderMaterial.create(buildProps({ quantityRequired: "0" }))).toThrow(/positive decimal/);
  });
});
