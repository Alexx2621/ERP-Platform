import { newId } from "@erp/database";
import { Plan } from "../../domain/plan.entity";
import { buildBillingTestContext, TENANT_ID } from "../../test-support/build-billing-test-context";
import { PlanNotFoundError } from "../errors";
import { AssignTenantPlanUseCase } from "./assign-tenant-plan.use-case";

describe("AssignTenantPlanUseCase", () => {
  it("activates a fresh tenant on the assigned plan and syncs App Registry access to it — no Recurrente call", async () => {
    const ctx = await buildBillingTestContext();
    const now = new Date();
    await ctx.plans.upsert(
      Plan.create({
        id: newId(),
        key: "business",
        name: "Business",
        description: "d",
        currency: "GTQ",
        basePriceAmount: "1599.0000",
        perUserPriceAmount: "59.0000",
        includesAppKeys: ["a", "b"],
        isSelfServe: true,
        recurrenteProductId: null,
        recurrentePriceId: null,
        createdAt: now,
        updatedAt: now,
      }),
    );

    const useCase = new AssignTenantPlanUseCase(ctx.plans, ctx.subscriptions, ctx.syncTenantAppsToPlan);
    const subscription = await useCase.execute({ tenantId: TENANT_ID, planKey: "business" });

    expect(subscription.status).toBe("ACTIVE");
    const apps = await ctx.listTenantApps.execute(TENANT_ID);
    expect(apps.find((a) => a.key === "a")?.status).toBe("ENABLED");
    expect(apps.find((a) => a.key === "b")?.status).toBe("ENABLED");
    expect(apps.find((a) => a.key === "c")?.status).toBe("DISABLED");
  });

  it("re-syncs access when switching an already-active tenant to a smaller plan", async () => {
    const ctx = await buildBillingTestContext();
    const now = new Date();
    await ctx.plans.upsert(
      Plan.create({ id: newId(), key: "business", name: "Business", description: "d", currency: "GTQ", basePriceAmount: "1599.0000", perUserPriceAmount: "59.0000", includesAppKeys: ["a", "b", "c"], isSelfServe: true, recurrenteProductId: null, recurrentePriceId: null, createdAt: now, updatedAt: now }),
    );
    await ctx.plans.upsert(
      Plan.create({ id: newId(), key: "starter", name: "Starter", description: "d", currency: "GTQ", basePriceAmount: "299.0000", perUserPriceAmount: "29.0000", includesAppKeys: ["a"], isSelfServe: true, recurrenteProductId: null, recurrentePriceId: null, createdAt: now, updatedAt: now }),
    );

    const useCase = new AssignTenantPlanUseCase(ctx.plans, ctx.subscriptions, ctx.syncTenantAppsToPlan);
    await useCase.execute({ tenantId: TENANT_ID, planKey: "business" });
    await useCase.execute({ tenantId: TENANT_ID, planKey: "starter" });

    const apps = await ctx.listTenantApps.execute(TENANT_ID);
    expect(apps.find((a) => a.key === "a")?.status).toBe("ENABLED");
    expect(apps.find((a) => a.key === "b")?.status).toBe("DISABLED");
    expect(apps.find((a) => a.key === "c")?.status).toBe("DISABLED");
  });

  it("rejects an unknown plan key", async () => {
    const ctx = await buildBillingTestContext();
    const useCase = new AssignTenantPlanUseCase(ctx.plans, ctx.subscriptions, ctx.syncTenantAppsToPlan);
    await expect(useCase.execute({ tenantId: TENANT_ID, planKey: "nonexistent" })).rejects.toThrow(PlanNotFoundError);
  });
});
