import { BillOfMaterialComponent, BillOfMaterialComponentProps } from "./bill-of-material-component.entity";

function buildProps(overrides: Partial<BillOfMaterialComponentProps> = {}): BillOfMaterialComponentProps {
  return {
    id: "component-1",
    tenantId: "tenant-1",
    billOfMaterialId: "bom-1",
    componentProductId: "product-2",
    componentVariantId: null,
    quantityPerUnit: "2.0000",
    createdAt: new Date("2026-09-03T00:00:00.000Z"),
    ...overrides,
  };
}

describe("BillOfMaterialComponent", () => {
  it("accepts a positive quantityPerUnit", () => {
    const component = BillOfMaterialComponent.create(buildProps());
    expect(component.quantityPerUnit).toBe("2.0000");
  });

  it("rejects a zero quantityPerUnit", () => {
    expect(() => BillOfMaterialComponent.create(buildProps({ quantityPerUnit: "0" }))).toThrow(/positive decimal/);
  });

  it("rejects a negative quantityPerUnit", () => {
    expect(() => BillOfMaterialComponent.create(buildProps({ quantityPerUnit: "-1" }))).toThrow(/positive decimal/);
  });
});
