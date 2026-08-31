import { Warehouse } from "./warehouse.entity";

function baseProps() {
  const now = new Date("2026-08-31T00:00:00.000Z");
  return {
    id: "warehouse-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    code: "WH-01",
    name: "Bodega Central",
    addressLine: null,
    city: null,
    country: null,
    status: "ACTIVE" as const,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

describe("Warehouse", () => {
  it("creates a warehouse with trimmed code and name", () => {
    const warehouse = Warehouse.create({ ...baseProps(), code: "  WH-01  ", name: "  Bodega Central  " });
    expect(warehouse.code).toBe("WH-01");
    expect(warehouse.name).toBe("Bodega Central");
  });

  it("rejects an empty code", () => {
    expect(() => Warehouse.create({ ...baseProps(), code: "   " })).toThrow("Warehouse code is required.");
  });

  it("rejects an empty name", () => {
    expect(() => Warehouse.create({ ...baseProps(), name: "   " })).toThrow("Warehouse name is required.");
  });

  it("updates name and address fields, bumping version", () => {
    const warehouse = Warehouse.create(baseProps());
    warehouse.update("Bodega Central 2", { addressLine: "Zona 4", city: "Ciudad", country: "GT" });
    expect(warehouse.name).toBe("Bodega Central 2");
    expect(warehouse.addressLine).toBe("Zona 4");
    expect(warehouse.version).toBe(2);
  });

  it("rejects updating to an empty name", () => {
    const warehouse = Warehouse.create(baseProps());
    expect(() => warehouse.update("   ", { addressLine: null, city: null, country: null })).toThrow(
      "Warehouse name is required.",
    );
  });

  it("clears optional fields back to null via update", () => {
    const warehouse = Warehouse.create({ ...baseProps(), addressLine: "Zona 4", city: "Ciudad" });
    warehouse.update("Bodega Central", { addressLine: null, city: null, country: null });
    expect(warehouse.addressLine).toBeNull();
    expect(warehouse.city).toBeNull();
  });

  it("toggles status idempotently, only bumping version on a real change", () => {
    const warehouse = Warehouse.create(baseProps());
    warehouse.setStatus("ACTIVE");
    expect(warehouse.version).toBe(1);
    warehouse.setStatus("INACTIVE");
    expect(warehouse.status).toBe("INACTIVE");
    expect(warehouse.version).toBe(2);
  });
});
