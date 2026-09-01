import { buildSalesTestContext } from "../../test-support/build-sales-test-context";
import { CustomerNotFoundError } from "../errors";

describe("ResolveCustomerTargetUseCase", () => {
  it("resolves without error for a customer belonging to the active company", async () => {
    const ctx = await buildSalesTestContext();
    await expect(
      ctx.resolveCustomerTarget.execute(ctx.tenantId, ctx.companyId, ctx.customer.id),
    ).resolves.toBeUndefined();
  });

  it("rejects a customer id that does not exist", async () => {
    const ctx = await buildSalesTestContext();
    await expect(ctx.resolveCustomerTarget.execute(ctx.tenantId, ctx.companyId, "missing")).rejects.toThrow(
      CustomerNotFoundError,
    );
  });

  it("rejects a customer belonging to a different company", async () => {
    const ctx = await buildSalesTestContext();
    await expect(
      ctx.resolveCustomerTarget.execute(ctx.tenantId, ctx.companyId, ctx.otherCompanyCustomer.id),
    ).rejects.toThrow(CustomerNotFoundError);
  });

  it("is exercised indirectly by CreateQuoteUseCase/CreateSalesOrderUseCase for an unknown customer", async () => {
    const ctx = await buildSalesTestContext();
    await expect(
      ctx.createSalesOrder.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, customerId: "missing", currency: "USD" }),
    ).rejects.toThrow(CustomerNotFoundError);
  });
});
