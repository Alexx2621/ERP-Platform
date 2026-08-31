import { Supplier } from "./supplier.entity";

function baseProps() {
  const now = new Date("2026-08-31T00:00:00.000Z");
  return {
    id: "supplier-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    code: "SUPP-01",
    name: "Textiles del Norte",
    legalName: null,
    taxId: null,
    email: null,
    phone: null,
    addressLine: null,
    city: null,
    country: null,
    status: "ACTIVE" as const,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

describe("Supplier", () => {
  it("creates a supplier with trimmed code and name", () => {
    const supplier = Supplier.create({ ...baseProps(), code: "  SUPP-01  ", name: "  Textiles del Norte  " });
    expect(supplier.code).toBe("SUPP-01");
    expect(supplier.name).toBe("Textiles del Norte");
  });

  it("rejects an empty code", () => {
    expect(() => Supplier.create({ ...baseProps(), code: "   " })).toThrow("Supplier code is required.");
  });

  it("rejects an empty name", () => {
    expect(() => Supplier.create({ ...baseProps(), name: "   " })).toThrow("Supplier name is required.");
  });

  it("updates name and contact fields, bumping version", () => {
    const supplier = Supplier.create(baseProps());
    supplier.update("Textiles del Norte S.A.", {
      legalName: "Textiles del Norte Sociedad Anónima",
      taxId: "TAX-987",
      email: "compras@textilesnorte.test",
      phone: "+50287654321",
      addressLine: "Zona Industrial 4",
      city: "Ciudad",
      country: "GT",
    });
    expect(supplier.name).toBe("Textiles del Norte S.A.");
    expect(supplier.taxId).toBe("TAX-987");
    expect(supplier.version).toBe(2);
  });

  it("rejects updating to an empty name", () => {
    const supplier = Supplier.create(baseProps());
    expect(() =>
      supplier.update("   ", {
        legalName: null,
        taxId: null,
        email: null,
        phone: null,
        addressLine: null,
        city: null,
        country: null,
      }),
    ).toThrow("Supplier name is required.");
  });

  it("clears optional fields back to null via update", () => {
    const supplier = Supplier.create({ ...baseProps(), taxId: "TAX-987", phone: "+50287654321" });
    supplier.update("Textiles del Norte", {
      legalName: null,
      taxId: null,
      email: null,
      phone: null,
      addressLine: null,
      city: null,
      country: null,
    });
    expect(supplier.taxId).toBeNull();
    expect(supplier.phone).toBeNull();
  });

  it("toggles status idempotently, only bumping version on a real change", () => {
    const supplier = Supplier.create(baseProps());
    supplier.setStatus("ACTIVE");
    expect(supplier.version).toBe(1);
    supplier.setStatus("INACTIVE");
    expect(supplier.status).toBe("INACTIVE");
    expect(supplier.version).toBe(2);
  });
});
