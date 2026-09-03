import { buildCrmTestContext } from "../../test-support/build-crm-test-context";
import { ActivityAlreadyCompletedError, ActivityMustRelateToExactlyOneError, LeadNotFoundError } from "../errors";

describe("Activity use cases", () => {
  it("CreateActivityUseCase accepts a lead-related activity", async () => {
    const ctx = await buildCrmTestContext();
    const lead = await ctx.createLead.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, name: "Ada" });
    const activity = await ctx.createActivity.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      type: "CALL",
      subject: "Intro call",
      relatedLeadId: lead.id,
    });
    expect(activity.relatedLeadId).toBe(lead.id);
    expect(activity.ownerId).toBe(ctx.actorUserId);
  });

  it("CreateActivityUseCase accepts a customer-related activity", async () => {
    const ctx = await buildCrmTestContext();
    const activity = await ctx.createActivity.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      type: "NOTE",
      subject: "Customer note",
      relatedCustomerId: ctx.customer.id,
    });
    expect(activity.relatedCustomerId).toBe(ctx.customer.id);
  });

  it("CreateActivityUseCase rejects an activity with none of lead/opportunity/customer set", async () => {
    const ctx = await buildCrmTestContext();
    await expect(
      ctx.createActivity.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, type: "NOTE", subject: "Orphan" }),
    ).rejects.toThrow(ActivityMustRelateToExactlyOneError);
  });

  it("CreateActivityUseCase rejects an activity with more than one relation set", async () => {
    const ctx = await buildCrmTestContext();
    const lead = await ctx.createLead.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, name: "Ada" });
    await expect(
      ctx.createActivity.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        type: "NOTE",
        subject: "Ambiguous",
        relatedLeadId: lead.id,
        relatedCustomerId: ctx.customer.id,
      }),
    ).rejects.toThrow(ActivityMustRelateToExactlyOneError);
  });

  it("CreateActivityUseCase rejects a lead from another company", async () => {
    const ctx = await buildCrmTestContext();
    const lead = await ctx.createLead.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, name: "Ada" });
    await expect(
      ctx.createActivity.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.otherCompanyId,
        actorUserId: ctx.actorUserId,
        type: "NOTE",
        subject: "Cross company",
        relatedLeadId: lead.id,
      }),
    ).rejects.toThrow(LeadNotFoundError);
  });

  it("CompleteActivityUseCase completes once and rejects completing twice", async () => {
    const ctx = await buildCrmTestContext();
    const activity = await ctx.createActivity.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      type: "TASK",
      subject: "Follow up",
      relatedCustomerId: ctx.customer.id,
    });
    const completed = await ctx.completeActivity.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: activity.id });
    expect(completed.isCompleted).toBe(true);
    await expect(ctx.completeActivity.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: activity.id })).rejects.toThrow(
      ActivityAlreadyCompletedError,
    );
  });

  it("ListActivitiesUseCase filters by relatedLeadId", async () => {
    const ctx = await buildCrmTestContext();
    const lead = await ctx.createLead.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, name: "Ada" });
    await ctx.createActivity.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, type: "CALL", subject: "Call", relatedLeadId: lead.id });
    await ctx.createActivity.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, actorUserId: ctx.actorUserId, type: "NOTE", subject: "Note", relatedCustomerId: ctx.customer.id });
    const leadActivities = await ctx.listActivities.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { relatedLeadId: lead.id, limit: 50 } });
    expect(leadActivities).toHaveLength(1);
    expect(leadActivities[0]?.relatedLeadId).toBe(lead.id);
  });
});
