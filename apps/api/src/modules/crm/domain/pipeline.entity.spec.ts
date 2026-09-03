import { Pipeline, PipelineProps } from "./pipeline.entity";

function props(overrides: Partial<PipelineProps> = {}): PipelineProps {
  const now = new Date();
  return {
    id: "pipeline-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    code: "SALES",
    name: "Sales Pipeline",
    status: "ACTIVE",
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("Pipeline", () => {
  it("rejects an empty code or name", () => {
    expect(() => Pipeline.create(props({ code: " " }))).toThrow();
    expect(() => Pipeline.create(props({ name: " " }))).toThrow();
  });

  it("rename() trims and rejects blank", () => {
    const pipeline = Pipeline.create(props());
    pipeline.rename("  Renewals  ");
    expect(pipeline.name).toBe("Renewals");
    expect(() => pipeline.rename(" ")).toThrow();
  });

  it("setStatus() is a no-op when unchanged, otherwise bumps version", () => {
    const pipeline = Pipeline.create(props());
    pipeline.setStatus("ACTIVE");
    expect(pipeline.version).toBe(1);
    pipeline.setStatus("INACTIVE");
    expect(pipeline.version).toBe(2);
  });
});
