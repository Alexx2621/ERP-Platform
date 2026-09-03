import { buildCrmTestContext } from "../../test-support/build-crm-test-context";

describe("GetPipelineSummaryUseCase", () => {
  it("sums OPEN opportunity amounts per stage, excluding closed ones", async () => {
    const ctx = await buildCrmTestContext();
    const oppA = await ctx.createOpportunity.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      name: "Deal A",
      pipelineId: ctx.pipeline.id,
      stageId: ctx.qualificationStage.id,
      amount: "1000.0000",
      currency: "USD",
    });
    await ctx.createOpportunity.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      name: "Deal B",
      pipelineId: ctx.pipeline.id,
      stageId: ctx.qualificationStage.id,
      amount: "500.0000",
      currency: "USD",
    });
    const dealC = await ctx.createOpportunity.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: ctx.actorUserId,
      name: "Deal C",
      pipelineId: ctx.pipeline.id,
      stageId: ctx.qualificationStage.id,
      amount: "9999.0000",
      currency: "USD",
    });
    // Closing Deal C should remove it from the open summary entirely.
    await ctx.moveOpportunityStage.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: dealC.id, stageId: ctx.wonStage.id });

    const summary = await ctx.getPipelineSummary.execute(ctx.tenantId, ctx.companyId, ctx.pipeline.id);
    const qualificationRow = summary.rows.find((r) => r.stageId === ctx.qualificationStage.id);
    expect(qualificationRow?.openCount).toBe(2);
    expect(qualificationRow?.openAmountTotal).toBe("1500.0000");
    expect(summary.totalOpenAmount).toBe("1500.0000");

    const wonRow = summary.rows.find((r) => r.stageId === ctx.wonStage.id);
    expect(wonRow?.openCount).toBe(0); // Deal C is WON, not OPEN — excluded here even though it sits on this stage.

    expect(oppA.stageId).toBe(ctx.qualificationStage.id);
  });

  it("returns a zero total for a pipeline with no opportunities", async () => {
    const ctx = await buildCrmTestContext();
    const summary = await ctx.getPipelineSummary.execute(ctx.tenantId, ctx.companyId, ctx.pipeline.id);
    expect(summary.totalOpenAmount).toBe("0.0000");
    expect(summary.rows.every((r) => r.openCount === 0)).toBe(true);
  });
});
