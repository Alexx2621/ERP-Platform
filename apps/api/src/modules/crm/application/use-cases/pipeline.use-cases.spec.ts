import { buildCrmTestContext } from "../../test-support/build-crm-test-context";
import { PipelineCodeAlreadyInUseError, PipelineNotFoundError } from "../errors";

describe("Pipeline use cases", () => {
  it("CreatePipelineUseCase rejects a duplicate code", async () => {
    const ctx = await buildCrmTestContext();
    await expect(
      ctx.createPipeline.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, code: ctx.pipeline.code, name: "Duplicate" }),
    ).rejects.toThrow(PipelineCodeAlreadyInUseError);
  });

  it("AddPipelineStageUseCase appends stages in order and rejects a stage flagged both won and lost", async () => {
    const ctx = await buildCrmTestContext();
    const stages = await ctx.listPipelineStages.execute(ctx.tenantId, ctx.companyId, ctx.pipeline.id);
    expect(stages.map((s) => s.name)).toEqual(["Qualification", "Negotiation", "Won", "Lost"]);
    expect(stages.map((s) => s.sortOrder)).toEqual([0, 1, 2, 3]);
    await expect(
      ctx.addPipelineStage.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, pipelineId: ctx.pipeline.id, name: "Bad", isWon: true, isLost: true }),
    ).rejects.toThrow(/cannot be both/);
  });

  it("AddPipelineStageUseCase rejects a pipeline from another company", async () => {
    const ctx = await buildCrmTestContext();
    await expect(
      ctx.addPipelineStage.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, pipelineId: ctx.pipeline.id, name: "Nope" }),
    ).rejects.toThrow(PipelineNotFoundError);
  });

  it("SetPipelineStatusUseCase deactivates a pipeline", async () => {
    const ctx = await buildCrmTestContext();
    const updated = await ctx.setPipelineStatus.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: ctx.pipeline.id, status: "INACTIVE" });
    expect(updated.status).toBe("INACTIVE");
  });

  it("ListPipelinesUseCase scopes to the company", async () => {
    const ctx = await buildCrmTestContext();
    const pipelines = await ctx.listPipelines.execute(ctx.tenantId, ctx.companyId);
    expect(pipelines.map((p) => p.id)).toEqual([ctx.pipeline.id]);
    const otherCompanyPipelines = await ctx.listPipelines.execute(ctx.tenantId, ctx.otherCompanyId);
    expect(otherCompanyPipelines).toHaveLength(0);
  });
});
