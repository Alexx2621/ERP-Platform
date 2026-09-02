import { JournalEntryLine, JournalEntryLineProps } from "./journal-entry-line.entity";

function props(overrides: Partial<JournalEntryLineProps> = {}): JournalEntryLineProps {
  return {
    id: "line-1",
    tenantId: "tenant-1",
    journalEntryId: "entry-1",
    accountId: "acc-1",
    lineNumber: 1,
    debit: "0",
    credit: "0",
    description: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("JournalEntryLine", () => {
  it("accepts a debit-only line", () => {
    const line = JournalEntryLine.create(props({ debit: "100.0000", credit: "0" }));
    expect(line.debit).toBe("100.0000");
    expect(line.credit).toBe("0");
  });

  it("accepts a credit-only line", () => {
    const line = JournalEntryLine.create(props({ debit: "0", credit: "50.0000" }));
    expect(line.credit).toBe("50.0000");
  });

  it("rejects a line with both debit and credit zero", () => {
    expect(() => JournalEntryLine.create(props({ debit: "0", credit: "0" }))).toThrow(/exactly one/);
  });

  it("rejects a line with both debit and credit positive", () => {
    expect(() => JournalEntryLine.create(props({ debit: "10.0000", credit: "5.0000" }))).toThrow(/exactly one/);
  });

  it("rejects a negative debit or credit", () => {
    expect(() => JournalEntryLine.create(props({ debit: "-10.0000", credit: "0" }))).toThrow();
  });
});
