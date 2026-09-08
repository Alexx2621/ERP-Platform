import { buildBillingTestContext, TENANT_ID } from "../../test-support/build-billing-test-context";

describe("SyncTenantAppsToPlanUseCase", () => {
  it("enables every included app in dependency order, from a tenant with nothing enabled", async () => {
    const ctx = await buildBillingTestContext();
    const result = await ctx.syncTenantAppsToPlan.execute(TENANT_ID, ["a", "b"]);

    expect(result.enabled.sort()).toEqual(["a", "b"]);
    expect(result.disabled).toEqual([]);

    const apps = await ctx.listTenantApps.execute(TENANT_ID);
    expect(apps.find((a) => a.key === "a")?.status).toBe("ENABLED");
    expect(apps.find((a) => a.key === "b")?.status).toBe("ENABLED");
    expect(apps.find((a) => a.key === "c")?.status).toBe("DISABLED");
  });

  it("disables every currently-enabled app not in the plan, in reverse dependency order", async () => {
    const ctx = await buildBillingTestContext();
    await ctx.enableApp.execute({ tenantId: TENANT_ID, key: "a" });
    await ctx.enableApp.execute({ tenantId: TENANT_ID, key: "b" });
    await ctx.enableApp.execute({ tenantId: TENANT_ID, key: "c" });

    const result = await ctx.syncTenantAppsToPlan.execute(TENANT_ID, ["c"]);

    expect(result.disabled.sort()).toEqual(["a", "b"]);
    const apps = await ctx.listTenantApps.execute(TENANT_ID);
    expect(apps.find((a) => a.key === "a")?.status).toBe("DISABLED");
    expect(apps.find((a) => a.key === "b")?.status).toBe("DISABLED");
    expect(apps.find((a) => a.key === "c")?.status).toBe("ENABLED");
  });

  it("disables an app whose only dependent is also being disabled, without ordering errors (b depends on a)", async () => {
    const ctx = await buildBillingTestContext();
    await ctx.enableApp.execute({ tenantId: TENANT_ID, key: "a" });
    await ctx.enableApp.execute({ tenantId: TENANT_ID, key: "b" });

    // Disabling to an empty plan must disable "b" before "a" — the reverse
    // fixed-point pass must retry "a" once "b" (its dependent) settles.
    const result = await ctx.syncTenantAppsToPlan.execute(TENANT_ID, []);
    expect(result.disabled.sort()).toEqual(["a", "b"]);
  });

  it("is idempotent — syncing to the same plan twice changes nothing the second time", async () => {
    const ctx = await buildBillingTestContext();
    await ctx.syncTenantAppsToPlan.execute(TENANT_ID, ["a", "b"]);
    const second = await ctx.syncTenantAppsToPlan.execute(TENANT_ID, ["a", "b"]);
    expect(second.enabled).toEqual([]);
    expect(second.disabled).toEqual([]);
  });

  it("a real cancellation (empty includedAppKeys) revokes every app the tenant has", async () => {
    const ctx = await buildBillingTestContext();
    await ctx.syncTenantAppsToPlan.execute(TENANT_ID, ["a", "b", "c"]);

    const result = await ctx.syncTenantAppsToPlan.execute(TENANT_ID, []);
    expect(result.disabled.sort()).toEqual(["a", "b", "c"]);

    const apps = await ctx.listTenantApps.execute(TENANT_ID);
    expect(apps.every((a) => a.status === "DISABLED")).toBe(true);
  });
});
