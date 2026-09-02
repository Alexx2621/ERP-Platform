import { Account, AccountProps } from "./account.entity";

function props(overrides: Partial<AccountProps> = {}): AccountProps {
  const now = new Date();
  return {
    id: "acc-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    parentAccountId: null,
    code: "1000",
    name: "Cash",
    type: "ASSET",
    status: "ACTIVE",
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("Account", () => {
  it("rejects an empty code or name", () => {
    expect(() => Account.create(props({ code: "  " }))).toThrow();
    expect(() => Account.create(props({ name: "  " }))).toThrow();
  });

  it.each([
    ["ASSET", "DEBIT"],
    ["EXPENSE", "DEBIT"],
    ["LIABILITY", "CREDIT"],
    ["EQUITY", "CREDIT"],
    ["REVENUE", "CREDIT"],
  ] as const)("derives normalBalance for %s as %s", (type, expected) => {
    const account = Account.create(props({ type }));
    expect(account.normalBalance).toBe(expected);
  });

  it("rename() trims, rejects blank, and bumps version", () => {
    const account = Account.create(props());
    account.rename("  Petty Cash  ");
    expect(account.name).toBe("Petty Cash");
    expect(account.version).toBe(2);
    expect(() => account.rename("   ")).toThrow();
  });

  it("setStatus() is a no-op when unchanged, otherwise bumps version", () => {
    const account = Account.create(props());
    account.setStatus("ACTIVE");
    expect(account.version).toBe(1);
    account.setStatus("INACTIVE");
    expect(account.status).toBe("INACTIVE");
    expect(account.version).toBe(2);
  });
});
