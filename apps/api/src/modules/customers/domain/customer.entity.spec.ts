import { Customer } from "./customer.entity";

function baseProps() {
  const now = new Date("2026-08-31T00:00:00.000Z");
  return {
    id: "customer-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    code: "CUST-01",
    name: "Acme Corp",
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

describe("Customer", () => {
  it("creates a customer with trimmed code and name", () => {
    const customer = Customer.create({ ...baseProps(), code: "  CUST-01  ", name: "  Acme Corp  " });
    expect(customer.code).toBe("CUST-01");
    expect(customer.name).toBe("Acme Corp");
  });

  it("rejects an empty code", () => {
    expect(() => Customer.create({ ...baseProps(), code: "   " })).toThrow("Customer code is required.");
  });

  it("rejects an empty name", () => {
    expect(() => Customer.create({ ...baseProps(), name: "   " })).toThrow("Customer name is required.");
  });

  it("updates name and contact fields, bumping version", () => {
    const customer = Customer.create(baseProps());
    customer.update("Acme Corporation", {
      legalName: "Acme Corp S.A.",
      taxId: "TAX-123",
      email: "billing@acme.test",
      phone: "+50212345678",
      addressLine: "Av. Siempre Viva 123",
      city: "Ciudad",
      country: "GT",
    });
    expect(customer.name).toBe("Acme Corporation");
    expect(customer.legalName).toBe("Acme Corp S.A.");
    expect(customer.taxId).toBe("TAX-123");
    expect(customer.email).toBe("billing@acme.test");
    expect(customer.version).toBe(2);
  });

  it("rejects updating to an empty name", () => {
    const customer = Customer.create(baseProps());
    expect(() =>
      customer.update("   ", {
        legalName: null,
        taxId: null,
        email: null,
        phone: null,
        addressLine: null,
        city: null,
        country: null,
      }),
    ).toThrow("Customer name is required.");
  });

  it("clears optional fields back to null via update", () => {
    const customer = Customer.create({ ...baseProps(), taxId: "TAX-123", email: "old@acme.test" });
    customer.update("Acme Corp", {
      legalName: null,
      taxId: null,
      email: null,
      phone: null,
      addressLine: null,
      city: null,
      country: null,
    });
    expect(customer.taxId).toBeNull();
    expect(customer.email).toBeNull();
  });

  it("toggles status idempotently, only bumping version on a real change", () => {
    const customer = Customer.create(baseProps());
    customer.setStatus("ACTIVE");
    expect(customer.version).toBe(1);
    customer.setStatus("INACTIVE");
    expect(customer.status).toBe("INACTIVE");
    expect(customer.version).toBe(2);
  });
});
