import { Tax } from "./tax.entity";

function baseProps() {
  const now = new Date("2026-08-31T00:00:00.000Z");
  return {
    id: "tax-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    code: "IVA",
    name: "IVA",
    rate: "12.0000",
    status: "ACTIVE" as const,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

describe("Tax", () => {
  it("creates a tax with trimmed code and name", () => {
    const tax = Tax.create({ ...baseProps(), code: "  IVA  ", name: "  IVA  " });
    expect(tax.code).toBe("IVA");
    expect(tax.name).toBe("IVA");
    expect(tax.rate).toBe("12.0000");
  });

  it("rejects an empty code", () => {
    expect(() => Tax.create({ ...baseProps(), code: "   " })).toThrow("Tax code is required.");
  });

  it("rejects an empty name", () => {
    expect(() => Tax.create({ ...baseProps(), name: "   " })).toThrow("Tax name is required.");
  });

  it("rejects a malformed rate", () => {
    expect(() => Tax.create({ ...baseProps(), rate: "not-a-number" })).toThrow(/Tax rate/);
  });

  it("rejects a negative rate", () => {
    expect(() => Tax.create({ ...baseProps(), rate: "-5" })).toThrow(/Tax rate/);
  });

  it("renames and re-rates, bumping version", () => {
    const tax = Tax.create(baseProps());
    tax.rename("IVA General", "13.0000");
    expect(tax.name).toBe("IVA General");
    expect(tax.rate).toBe("13.0000");
    expect(tax.version).toBe(2);
  });

  it("rejects renaming to an empty name", () => {
    const tax = Tax.create(baseProps());
    expect(() => tax.rename("   ", "12.0000")).toThrow("Tax name is required.");
  });

  it("toggles status idempotently, only bumping version on a real change", () => {
    const tax = Tax.create(baseProps());
    tax.setStatus("ACTIVE");
    expect(tax.version).toBe(1);
    tax.setStatus("INACTIVE");
    expect(tax.status).toBe("INACTIVE");
    expect(tax.version).toBe(2);
  });
});
