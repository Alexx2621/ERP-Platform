import { buildPurchasingTestContext } from "../../test-support/build-purchasing-test-context";
import { SupplierNotFoundError } from "../errors";

describe("ResolveSupplierTargetUseCase", () => {
  it("resolves without error for a supplier belonging to the active company", async () => {
    const ctx = await buildPurchasingTestContext();
    await expect(
      ctx.resolveSupplierTarget.execute(ctx.tenantId, ctx.companyId, ctx.supplier.id),
    ).resolves.toBeUndefined();
  });

  it("rejects a supplier id that does not exist", async () => {
    const ctx = await buildPurchasingTestContext();
    await expect(ctx.resolveSupplierTarget.execute(ctx.tenantId, ctx.companyId, "missing")).rejects.toThrow(
      SupplierNotFoundError,
    );
  });

  it("rejects a supplier belonging to a different company", async () => {
    const ctx = await buildPurchasingTestContext();
    await expect(
      ctx.resolveSupplierTarget.execute(ctx.tenantId, ctx.companyId, ctx.otherCompanySupplier.id),
    ).rejects.toThrow(SupplierNotFoundError);
  });

  it("is exercised indirectly by CreatePurchaseOrderUseCase for an unknown supplier", async () => {
    const ctx = await buildPurchasingTestContext();
    await expect(
      ctx.createPurchaseOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, supplierId: "missing", currency: "USD" }),
    ).rejects.toThrow(SupplierNotFoundError);
  });
});
