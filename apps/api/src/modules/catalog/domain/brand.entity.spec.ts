import { Brand } from "./brand.entity";

const base = {
  id: "b1",
  tenantId: "t1",
  companyId: "c1",
  status: "ACTIVE" as const,
  version: 1,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("Brand", () => {
  it("rejects an empty name", () => {
    expect(() => Brand.create({ ...base, code: "ACME", name: "  " })).toThrow();
  });

  it("rename() bumps version", () => {
    const brand = Brand.create({ ...base, code: "ACME", name: "Acme" });
    brand.rename("Acme Inc.");
    expect(brand.name).toBe("Acme Inc.");
    expect(brand.version).toBe(2);
  });

  it("setStatus() bumps version only on a real transition", () => {
    const brand = Brand.create({ ...base, code: "ACME", name: "Acme" });
    brand.setStatus("INACTIVE");
    expect(brand.version).toBe(2);
    brand.setStatus("INACTIVE");
    expect(brand.version).toBe(2);
  });
});
