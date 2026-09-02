import { buildAccountingTestContext } from "../../test-support/build-accounting-test-context";
import { AccountCodeAlreadyInUseError, AccountNotFoundError, ParentAccountNotFoundError } from "../errors";

describe("Account use cases", () => {
  it("CreateAccountUseCase rejects a duplicate code within the same company", async () => {
    const ctx = await buildAccountingTestContext();
    await expect(
      ctx.createAccount.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, code: ctx.cash.code, name: "Duplicate", type: "ASSET" }),
    ).rejects.toThrow(AccountCodeAlreadyInUseError);
  });

  it("CreateAccountUseCase allows the same code across different companies", async () => {
    const ctx = await buildAccountingTestContext();
    const account = await ctx.createAccount.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.otherCompanyId,
      code: ctx.cash.code,
      name: "Cash (other company)",
      type: "ASSET",
    });
    expect(account.code).toBe(ctx.cash.code);
  });

  it("CreateAccountUseCase links a real parent account and rejects a foreign one", async () => {
    const ctx = await buildAccountingTestContext();
    const child = await ctx.createAccount.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      code: "1010",
      name: "Petty Cash",
      type: "ASSET",
      parentAccountId: ctx.cash.id,
    });
    expect(child.parentAccountId).toBe(ctx.cash.id);

    await expect(
      ctx.createAccount.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        code: "1020",
        name: "Bad parent",
        type: "ASSET",
        parentAccountId: "does-not-exist",
      }),
    ).rejects.toThrow(ParentAccountNotFoundError);
  });

  it("UpdateAccountUseCase renames and rejects an account from another company", async () => {
    const ctx = await buildAccountingTestContext();
    const renamed = await ctx.updateAccount.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: ctx.cash.id, name: "Petty Cash" });
    expect(renamed.name).toBe("Petty Cash");

    await expect(
      ctx.updateAccount.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, id: ctx.cash.id, name: "Hijacked" }),
    ).rejects.toThrow(AccountNotFoundError);
  });

  it("SetAccountStatusUseCase deactivates an account", async () => {
    const ctx = await buildAccountingTestContext();
    const updated = await ctx.setAccountStatus.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: ctx.cash.id, status: "INACTIVE" });
    expect(updated.status).toBe("INACTIVE");
  });

  it("ListAccountsUseCase filters by type and scopes to the company", async () => {
    const ctx = await buildAccountingTestContext();
    const assets = await ctx.listAccounts.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { type: "ASSET", limit: 100 } });
    expect(assets.every((a) => a.type === "ASSET")).toBe(true);
    expect(assets.some((a) => a.id === ctx.cash.id)).toBe(true);
    expect(assets.some((a) => a.id === ctx.revenue.id)).toBe(false);
  });

  it("GetAccountUseCase returns null for a nonexistent id, without a company filter", async () => {
    const ctx = await buildAccountingTestContext();
    expect(await ctx.getAccount.execute(ctx.tenantId, "nope")).toBeNull();
    expect(await ctx.getAccount.execute(ctx.tenantId, ctx.cash.id)).not.toBeNull();
  });
});
