import { buildCrmTestContext } from "../../test-support/build-crm-test-context";
import { LeadAlreadyTerminalError, LeadNotFoundError } from "../errors";

describe("Lead use cases", () => {
  it("CreateLeadUseCase defaults the owner to the creating user", async () => {
    const ctx = await buildCrmTestContext();
    const lead = await ctx.createLead.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, name: "Ada Lovelace" });
    expect(lead.ownerId).toBe(ctx.actorUserId);
    expect(lead.status).toBe("NEW");
  });

  it("CreateLeadUseCase lowercases email", async () => {
    const ctx = await buildCrmTestContext();
    const lead = await ctx.createLead.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      name: "Ada",
      email: "Ada@Example.com",
    });
    expect(lead.email).toBe("ada@example.com");
  });

  it("UpdateLeadUseCase preserves omitted fields and clears explicit empty strings", async () => {
    const ctx = await buildCrmTestContext();
    const lead = await ctx.createLead.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      name: "Ada",
      phone: "555-0100",
      source: "referral",
    });
    const updated = await ctx.updateLead.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: lead.id, name: "Ada Lovelace", source: "" });
    expect(updated.phone).toBe("555-0100"); // omitted -> preserved
    expect(updated.source).toBeNull(); // "" -> cleared
  });

  it("UpdateLeadUseCase rejects a lead from another company", async () => {
    const ctx = await buildCrmTestContext();
    const lead = await ctx.createLead.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, name: "Ada" });
    await expect(
      ctx.updateLead.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, id: lead.id, name: "Hijacked" }),
    ).rejects.toThrow(LeadNotFoundError);
  });

  it("SetLeadStatusUseCase moves between non-terminal statuses and rejects once terminal", async () => {
    const ctx = await buildCrmTestContext();
    const lead = await ctx.createLead.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, name: "Ada" });
    const contacted = await ctx.setLeadStatus.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: lead.id, status: "CONTACTED" });
    expect(contacted.status).toBe("CONTACTED");
    const lost = await ctx.setLeadStatus.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: lead.id, status: "LOST" });
    expect(lost.status).toBe("LOST");
    await expect(
      ctx.setLeadStatus.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: lead.id, status: "CONTACTED" }),
    ).rejects.toThrow(LeadAlreadyTerminalError);
  });

  it("SetLeadConsentUseCase grants and revokes marketing consent", async () => {
    const ctx = await buildCrmTestContext();
    const lead = await ctx.createLead.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, name: "Ada" });
    const granted = await ctx.setLeadConsent.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: lead.id, consentMarketing: true });
    expect(granted.consentMarketing).toBe(true);
    expect(granted.consentedAt).not.toBeNull();
    const revoked = await ctx.setLeadConsent.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: lead.id, consentMarketing: false });
    expect(revoked.consentMarketing).toBe(false);
    expect(revoked.consentedAt).toBeNull();
  });

  it("ConvertLeadUseCase creates a new Customer when no email match exists", async () => {
    const ctx = await buildCrmTestContext();
    const lead = await ctx.createLead.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      name: "Grace Hopper",
      companyName: "Hopper LLC",
      email: "grace@hopper.dev",
    });
    const { lead: converted, customer, wasExistingCustomer } = await ctx.convertLead.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: lead.id });
    expect(converted.status).toBe("CONVERTED");
    expect(converted.convertedCustomerId).toBe(customer.id);
    expect(customer.name).toBe("Hopper LLC");
    expect(wasExistingCustomer).toBe(false);
  });

  it("ConvertLeadUseCase reuses an existing Customer matched by email instead of duplicating it", async () => {
    const ctx = await buildCrmTestContext();
    const existing = await ctx.createCustomer.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, code: "CUST-EXIST", name: "Existing Co", email: "repeat@example.com" });
    const lead = await ctx.createLead.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      name: "Repeat Buyer",
      email: "repeat@example.com",
    });
    const { customer, wasExistingCustomer } = await ctx.convertLead.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: lead.id });
    expect(customer.id).toBe(existing.id);
    expect(wasExistingCustomer).toBe(true);
  });

  it("ConvertLeadUseCase rejects converting an already-terminal lead", async () => {
    const ctx = await buildCrmTestContext();
    const lead = await ctx.createLead.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, name: "Ada" });
    await ctx.setLeadStatus.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: lead.id, status: "LOST" });
    await expect(ctx.convertLead.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: lead.id })).rejects.toThrow(LeadAlreadyTerminalError);
  });

  it("ListLeadsUseCase filters by status and scopes to the company", async () => {
    const ctx = await buildCrmTestContext();
    const lead = await ctx.createLead.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, name: "Ada" });
    await ctx.setLeadStatus.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: lead.id, status: "CONTACTED" });
    const contacted = await ctx.listLeads.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { status: "CONTACTED", limit: 50 } });
    expect(contacted.map((l) => l.id)).toEqual([lead.id]);
    const newOnes = await ctx.listLeads.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { status: "NEW", limit: 50 } });
    expect(newOnes).toHaveLength(0);
  });

  it("GetLeadUseCase rejects a lead from another company", async () => {
    const ctx = await buildCrmTestContext();
    const lead = await ctx.createLead.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, name: "Ada" });
    await expect(ctx.getLead.execute(ctx.tenantId, ctx.otherCompanyId, lead.id)).rejects.toThrow(LeadNotFoundError);
  });
});
