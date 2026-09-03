import { buildCrmTestContext } from "../../test-support/build-crm-test-context";
import { CustomerNotFoundError, OpportunityNotFoundError, OpportunityNotOpenError, PipelineStageNotFoundError } from "../errors";

describe("Opportunity use cases", () => {
  it("CreateOpportunityUseCase links a real customer and defaults the owner to the actor", async () => {
    const ctx = await buildCrmTestContext();
    const opp = await ctx.createOpportunity.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      name: "Acme Renewal",
      pipelineId: ctx.pipeline.id,
      stageId: ctx.qualificationStage.id,
      customerId: ctx.customer.id,
      amount: "5000.0000",
      currency: "USD",
    });
    expect(opp.customerId).toBe(ctx.customer.id);
    expect(opp.ownerId).toBe(ctx.actorUserId);
    expect(opp.status).toBe("OPEN");
  });

  it("CreateOpportunityUseCase rejects a customer from another company", async () => {
    const ctx = await buildCrmTestContext();
    const foreignCustomer = await ctx.createCustomer.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, code: "CUST-2", name: "Foreign Co" });
    await expect(
      ctx.createOpportunity.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        name: "Bad",
        pipelineId: ctx.pipeline.id,
        stageId: ctx.qualificationStage.id,
        customerId: foreignCustomer.id,
        amount: "100.0000",
        currency: "USD",
      }),
    ).rejects.toThrow(CustomerNotFoundError);
  });

  it("CreateOpportunityUseCase rejects a stage that belongs to a different pipeline", async () => {
    const ctx = await buildCrmTestContext();
    const otherPipeline = await ctx.createPipeline.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, code: "OTHER", name: "Other Pipeline" });
    await expect(
      ctx.createOpportunity.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: ctx.actorUserId,
        name: "Bad",
        pipelineId: otherPipeline.id,
        stageId: ctx.qualificationStage.id,
        amount: "100.0000",
        currency: "USD",
      }),
    ).rejects.toThrow(PipelineStageNotFoundError);
  });

  it("MoveOpportunityStageUseCase moves within the pipeline without closing on a non-terminal stage", async () => {
    const ctx = await buildCrmTestContext();
    const opp = await ctx.createOpportunity.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      name: "Deal",
      pipelineId: ctx.pipeline.id,
      stageId: ctx.qualificationStage.id,
      amount: "100.0000",
      currency: "USD",
    });
    const moved = await ctx.moveOpportunityStage.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: opp.id, stageId: ctx.negotiationStage.id });
    expect(moved.stageId).toBe(ctx.negotiationStage.id);
    expect(moved.status).toBe("OPEN");
  });

  it("MoveOpportunityStageUseCase closes the opportunity as WON on a won stage", async () => {
    const ctx = await buildCrmTestContext();
    const opp = await ctx.createOpportunity.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      name: "Deal",
      pipelineId: ctx.pipeline.id,
      stageId: ctx.qualificationStage.id,
      amount: "100.0000",
      currency: "USD",
    });
    const won = await ctx.moveOpportunityStage.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: opp.id, stageId: ctx.wonStage.id });
    expect(won.status).toBe("WON");
    expect(won.closedAt).not.toBeNull();
  });

  it("MoveOpportunityStageUseCase rejects moving an already-closed opportunity", async () => {
    const ctx = await buildCrmTestContext();
    const opp = await ctx.createOpportunity.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      name: "Deal",
      pipelineId: ctx.pipeline.id,
      stageId: ctx.qualificationStage.id,
      amount: "100.0000",
      currency: "USD",
    });
    await ctx.moveOpportunityStage.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: opp.id, stageId: ctx.lostStage.id });
    await expect(
      ctx.moveOpportunityStage.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: opp.id, stageId: ctx.negotiationStage.id }),
    ).rejects.toThrow(OpportunityNotOpenError);
  });

  it("UpdateOpportunityUseCase rejects updating a closed opportunity", async () => {
    const ctx = await buildCrmTestContext();
    const opp = await ctx.createOpportunity.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      name: "Deal",
      pipelineId: ctx.pipeline.id,
      stageId: ctx.qualificationStage.id,
      amount: "100.0000",
      currency: "USD",
    });
    await ctx.moveOpportunityStage.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: opp.id, stageId: ctx.wonStage.id });
    await expect(
      ctx.updateOpportunity.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: opp.id, name: "Renamed", amount: "200.0000" }),
    ).rejects.toThrow(OpportunityNotOpenError);
  });

  it("GetOpportunityUseCase rejects an opportunity from another company", async () => {
    const ctx = await buildCrmTestContext();
    const opp = await ctx.createOpportunity.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      name: "Deal",
      pipelineId: ctx.pipeline.id,
      stageId: ctx.qualificationStage.id,
      amount: "100.0000",
      currency: "USD",
    });
    await expect(ctx.getOpportunity.execute(ctx.tenantId, ctx.otherCompanyId, opp.id)).rejects.toThrow(OpportunityNotFoundError);
  });
});
