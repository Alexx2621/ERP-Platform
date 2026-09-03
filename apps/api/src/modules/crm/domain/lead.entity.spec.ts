import { Lead, LeadProps } from "./lead.entity";

function props(overrides: Partial<LeadProps> = {}): LeadProps {
  const now = new Date();
  return {
    id: "lead-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    name: "Ada Lovelace",
    companyName: null,
    email: null,
    phone: null,
    source: null,
    status: "NEW",
    ownerId: "user-1",
    consentMarketing: false,
    consentedAt: null,
    convertedCustomerId: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("Lead", () => {
  it("rejects an empty name", () => {
    expect(() => Lead.create(props({ name: "  " }))).toThrow();
  });

  it("setStatus() moves freely between non-terminal statuses", () => {
    const lead = Lead.create(props());
    lead.setStatus("CONTACTED");
    expect(lead.status).toBe("CONTACTED");
    lead.setStatus("QUALIFIED");
    expect(lead.status).toBe("QUALIFIED");
  });

  it("setStatus() is a no-op when unchanged", () => {
    const lead = Lead.create(props());
    lead.setStatus("NEW");
    expect(lead.version).toBe(1);
  });

  it("setStatus() rejects any transition once a lead is terminal (LOST)", () => {
    const lead = Lead.create(props());
    lead.setStatus("LOST");
    expect(lead.isTerminal).toBe(true);
    expect(() => lead.setStatus("CONTACTED")).toThrow(/Cannot change status/);
  });

  it("markConverted() sets CONVERTED and the customer pointer, and is terminal", () => {
    const lead = Lead.create(props());
    const now = new Date();
    lead.markConverted("customer-1", now);
    expect(lead.status).toBe("CONVERTED");
    expect(lead.convertedCustomerId).toBe("customer-1");
    expect(lead.isTerminal).toBe(true);
    expect(() => lead.markConverted("customer-2", now)).toThrow(/Cannot convert/);
  });

  it("setConsent() records consentedAt only when granting, clears it when revoking", () => {
    const lead = Lead.create(props());
    const now = new Date("2026-01-01T00:00:00Z");
    lead.setConsent(true, now);
    expect(lead.consentMarketing).toBe(true);
    expect(lead.consentedAt).toBe(now);
    lead.setConsent(false, new Date());
    expect(lead.consentMarketing).toBe(false);
    expect(lead.consentedAt).toBeNull();
  });

  it("update() trims name and rejects blank", () => {
    const lead = Lead.create(props());
    lead.update({ name: "  Ada  ", companyName: "Acme", email: null, phone: null, source: "referral" });
    expect(lead.name).toBe("Ada");
    expect(lead.companyName).toBe("Acme");
    expect(() => lead.update({ name: " ", companyName: null, email: null, phone: null, source: null })).toThrow();
  });

  it("reassignOwner() bumps version", () => {
    const lead = Lead.create(props());
    lead.reassignOwner("user-2");
    expect(lead.ownerId).toBe("user-2");
    expect(lead.version).toBe(2);
  });
});
