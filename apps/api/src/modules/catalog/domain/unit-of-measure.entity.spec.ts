import { UnitOfMeasure } from "./unit-of-measure.entity";

const base = {
  id: "u1",
  tenantId: "t1",
  companyId: "c1",
  status: "ACTIVE" as const,
  version: 1,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("UnitOfMeasure", () => {
  it("rejects an empty code", () => {
    expect(() => UnitOfMeasure.create({ ...base, code: "  ", name: "Unidad", symbol: "u" })).toThrow();
  });

  it("trims code/name/symbol", () => {
    const unit = UnitOfMeasure.create({ ...base, code: " UN ", name: " Unidad ", symbol: " u " });
    expect(unit.code).toBe("UN");
    expect(unit.name).toBe("Unidad");
    expect(unit.symbol).toBe("u");
  });

  it("rename() bumps version and updatedAt", () => {
    const unit = UnitOfMeasure.create({ ...base, code: "UN", name: "Unidad", symbol: "u" });
    unit.rename("Unidades", "und");
    expect(unit.name).toBe("Unidades");
    expect(unit.symbol).toBe("und");
    expect(unit.version).toBe(2);
  });

  it("setStatus() is a no-op when already in that status", () => {
    const unit = UnitOfMeasure.create({ ...base, code: "UN", name: "Unidad", symbol: "u" });
    unit.setStatus("ACTIVE");
    expect(unit.version).toBe(1);
  });
});
