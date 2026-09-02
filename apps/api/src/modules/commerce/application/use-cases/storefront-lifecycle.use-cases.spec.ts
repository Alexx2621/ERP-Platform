import { buildCommerceTestContext } from "../../test-support/build-commerce-test-context";
import { StorefrontCodeAlreadyInUseError, StorefrontNotFoundError, WarehouseNotFoundError } from "../errors";

describe("Storefront lifecycle use cases", () => {
  it("CreateStorefrontUseCase creates a storefront, validating an optional default warehouse", async () => {
    const ctx = await buildCommerceTestContext();
    const storefront = await ctx.createStorefront.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      code: "Second-Store",
      name: "Second store",
      currency: "usd",
      defaultWarehouseId: ctx.warehouse.id,
    });
    expect(storefront.code).toBe("second-store");
    expect(storefront.currency).toBe("USD");
    expect(storefront.defaultWarehouseId).toBe(ctx.warehouse.id);
  });

  it("rejects a duplicate global code", async () => {
    const ctx = await buildCommerceTestContext();
    await expect(
      ctx.createStorefront.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, code: "main-store", name: "Dup", currency: "USD" }),
    ).rejects.toThrow(StorefrontCodeAlreadyInUseError);
  });

  it("rejects a warehouse that doesn't belong to the company", async () => {
    const ctx = await buildCommerceTestContext();
    await expect(
      ctx.createStorefront.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        code: "third-store",
        name: "Third",
        currency: "USD",
        defaultWarehouseId: "nonexistent-warehouse",
      }),
    ).rejects.toThrow(WarehouseNotFoundError);
  });

  it("SetStorefrontStatusUseCase toggles status and rejects a foreign storefront", async () => {
    const ctx = await buildCommerceTestContext();
    const updated = await ctx.setStorefrontStatus.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: ctx.storefront.id, status: "INACTIVE" });
    expect(updated.status).toBe("INACTIVE");

    await expect(
      ctx.setStorefrontStatus.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, id: ctx.storefront.id, status: "ACTIVE" }),
    ).rejects.toThrow(StorefrontNotFoundError);
  });

  it("ListStorefrontsUseCase scopes to the company", async () => {
    const ctx = await buildCommerceTestContext();
    const list = await ctx.listStorefronts.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 10 } });
    expect(list.map((s) => s.id)).toContain(ctx.storefront.id);

    const otherList = await ctx.listStorefronts.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, filter: { limit: 10 } });
    expect(otherList.map((s) => s.id)).not.toContain(ctx.storefront.id);
  });
});
