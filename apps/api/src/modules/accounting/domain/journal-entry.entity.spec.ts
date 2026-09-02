import { JournalEntry, JournalEntryProps } from "./journal-entry.entity";

function props(overrides: Partial<JournalEntryProps> = {}): JournalEntryProps {
  return {
    id: "entry-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    fiscalPeriodId: "period-1",
    entryDate: new Date("2026-01-15"),
    description: "Opening balance",
    sourceType: null,
    sourceId: null,
    reversalOfEntryId: null,
    reversedByEntryId: null,
    reversedAt: null,
    createdByUserId: "user-1",
    correlationId: "correlation-1",
    createdAt: new Date(),
    ...overrides,
  };
}

describe("JournalEntry", () => {
  it("rejects an empty description", () => {
    expect(() => JournalEntry.create(props({ description: "  " }))).toThrow();
  });

  it("isReversed is false until markReversed is called", () => {
    const entry = JournalEntry.create(props());
    expect(entry.isReversed).toBe(false);
  });

  it("markReversed sets reversedByEntryId/reversedAt and flips isReversed", () => {
    const entry = JournalEntry.create(props());
    const now = new Date("2026-02-01T00:00:00Z");
    entry.markReversed("reversal-1", now);
    expect(entry.reversedByEntryId).toBe("reversal-1");
    expect(entry.reversedAt).toBe(now);
    expect(entry.isReversed).toBe(true);
  });

  it("markReversed is terminal — reversing twice throws", () => {
    const entry = JournalEntry.create(props());
    entry.markReversed("reversal-1", new Date());
    expect(() => entry.markReversed("reversal-2", new Date())).toThrow(/already been reversed/);
  });
});
