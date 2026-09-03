import { PipelineStage, PipelineStageProps } from "./pipeline-stage.entity";

function props(overrides: Partial<PipelineStageProps> = {}): PipelineStageProps {
  const now = new Date();
  return {
    id: "stage-1",
    tenantId: "tenant-1",
    pipelineId: "pipeline-1",
    name: "Qualification",
    sortOrder: 1,
    isWon: false,
    isLost: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("PipelineStage", () => {
  it("rejects an empty name", () => {
    expect(() => PipelineStage.create(props({ name: " " }))).toThrow();
  });

  it("rejects a stage marked both won and lost", () => {
    expect(() => PipelineStage.create(props({ isWon: true, isLost: true }))).toThrow(/cannot be both/);
  });

  it("isClosing is true for either a won or a lost stage", () => {
    expect(PipelineStage.create(props({ isWon: true })).isClosing).toBe(true);
    expect(PipelineStage.create(props({ isLost: true })).isClosing).toBe(true);
    expect(PipelineStage.create(props()).isClosing).toBe(false);
  });
});
