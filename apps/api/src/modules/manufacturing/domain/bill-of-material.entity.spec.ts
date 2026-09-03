import { BillOfMaterial, BillOfMaterialProps } from "./bill-of-material.entity";

function buildProps(overrides: Partial<BillOfMaterialProps> = {}): BillOfMaterialProps {
  const now = new Date("2026-09-03T00:00:00.000Z");
  return {
    id: "bom-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    productId: "product-1",
    code: "BOM-CHAIR",
    name: "Silla de madera",
    version: 1,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("BillOfMaterial", () => {
  it("trims code and name", () => {
    const bom = BillOfMaterial.create(buildProps({ code: "  BOM-CHAIR  ", name: "  Silla  " }));
    expect(bom.code).toBe("BOM-CHAIR");
    expect(bom.name).toBe("Silla");
  });

  it("rejects a blank code", () => {
    expect(() => BillOfMaterial.create(buildProps({ code: "   " }))).toThrow(/code is required/);
  });

  it("rejects a blank name", () => {
    expect(() => BillOfMaterial.create(buildProps({ name: "   " }))).toThrow(/name is required/);
  });

  it("changes status", () => {
    const bom = BillOfMaterial.create(buildProps());
    bom.setStatus("INACTIVE");
    expect(bom.status).toBe("INACTIVE");
  });
});
