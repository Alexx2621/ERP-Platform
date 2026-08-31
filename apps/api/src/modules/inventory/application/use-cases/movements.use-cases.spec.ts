import { buildInventoryTestContext } from "../../test-support/build-inventory-test-context";
import { InventoryMovement } from "../../domain/inventory-movement.entity";
import { RecordReceiptUseCase } from "./record-receipt.use-case";
import { RecordIssueUseCase } from "./record-issue.use-case";
import { AdjustInventoryUseCase } from "./adjust-inventory.use-case";
import { InsufficientInventoryError } from "../errors";

async function buildUseCases(ctx: Awaited<ReturnType<typeof buildInventoryTestContext>>) {
  return {
    receipt: new RecordReceiptUseCase(ctx.balances, ctx.resolveWarehouse, ctx.resolveProduct),
    issue: new RecordIssueUseCase(ctx.balances, ctx.resolveWarehouse, ctx.resolveProduct),
    adjust: new AdjustInventoryUseCase(ctx.balances, ctx.resolveWarehouse, ctx.resolveProduct),
  };
}

describe("RecordReceiptUseCase", () => {
  it("increases on-hand stock and appends a RECEIPT movement", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt } = await buildUseCases(ctx);

    const { movement, balance } = await receipt.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
      quantity: "100.0000",
    });

    expect(movement.type).toBe("RECEIPT");
    expect(movement.quantity).toBe("100.0000");
    expect(balance.onHandQuantity).toBe("100.0000");
    expect(balance.availableQuantity).toBe("100.0000");
    expect(ctx.movements.items).toHaveLength(1);
  });

  it("accumulates on-hand across repeated receipts of the same product/warehouse", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt } = await buildUseCases(ctx);
    const input = {
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
      quantity: "10.0000",
    };
    await receipt.execute(input);
    const { balance } = await receipt.execute(input);
    expect(balance.onHandQuantity).toBe("20.0000");
    expect(balance.version).toBe(2);
  });

  it("requires a productVariantId for a hasVariants product and applies it to the correct balance row", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt } = await buildUseCases(ctx);
    const { balance } = await receipt.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.variantProduct.id,
      productVariantId: ctx.variant.id,
      quantity: "5.0000",
    });
    expect(balance.productVariantId).toBe(ctx.variant.id);
  });
});

describe("RecordIssueUseCase", () => {
  it("decreases on-hand stock", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt, issue } = await buildUseCases(ctx);
    const base = {
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
    };
    await receipt.execute({ ...base, quantity: "20.0000" });
    const { movement, balance } = await issue.execute({ ...base, quantity: "5.0000" });

    expect(movement.type).toBe("ISSUE");
    expect(movement.quantity).toBe("-5.0000");
    expect(balance.onHandQuantity).toBe("15.0000");
  });

  it("rejects an issue that would oversell (drive on-hand negative)", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt, issue } = await buildUseCases(ctx);
    const base = {
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
    };
    await receipt.execute({ ...base, quantity: "5.0000" });
    await expect(issue.execute({ ...base, quantity: "10.0000" })).rejects.toThrow(InsufficientInventoryError);

    // The rejected movement must never have been appended to the ledger.
    expect(ctx.movements.items).toHaveLength(1);
  });

  it("rejects an issue from a warehouse with no stock at all", async () => {
    const ctx = await buildInventoryTestContext();
    const { issue } = await buildUseCases(ctx);
    await expect(
      issue.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: "user-1",
        correlationId: "corr-1",
        warehouseId: ctx.warehouse1.id,
        productId: ctx.trackedProduct.id,
        quantity: "1.0000",
      }),
    ).rejects.toThrow(InsufficientInventoryError);
  });
});

describe("AdjustInventoryUseCase", () => {
  it("increases on-hand for direction INCREASE", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt, adjust } = await buildUseCases(ctx);
    const base = {
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
    };
    await receipt.execute({ ...base, quantity: "10.0000" });
    const { movement, balance } = await adjust.execute({
      ...base,
      direction: "INCREASE",
      quantity: "3.0000",
      reason: "Physical count found extra stock",
    });
    expect(movement.quantity).toBe("3.0000");
    expect(balance.onHandQuantity).toBe("13.0000");
  });

  it("decreases on-hand for direction DECREASE", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt, adjust } = await buildUseCases(ctx);
    const base = {
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
    };
    await receipt.execute({ ...base, quantity: "10.0000" });
    const { movement, balance } = await adjust.execute({
      ...base,
      direction: "DECREASE",
      quantity: "4.0000",
      reason: "Damaged goods written off",
    });
    expect(movement.quantity).toBe("-4.0000");
    expect(balance.onHandQuantity).toBe("6.0000");
  });

  it("rejects an empty reason", async () => {
    const ctx = await buildInventoryTestContext();
    const { adjust } = await buildUseCases(ctx);
    await expect(
      adjust.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: "user-1",
        correlationId: "corr-1",
        warehouseId: ctx.warehouse1.id,
        productId: ctx.trackedProduct.id,
        direction: "INCREASE",
        quantity: "1.0000",
        reason: "   ",
      }),
    ).rejects.toThrow(/requires a reason/);
  });

  it("rejects a DECREASE that would drive on-hand below already-reserved stock", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt, adjust } = await buildUseCases(ctx);
    const base = {
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
    };
    await receipt.execute({ ...base, quantity: "10.0000" });
    // Directly seed a reservation on the balance without going through
    // CreateReservationUseCase, to isolate this test to AdjustInventoryUseCase.
    await ctx.balances.applyMovement(
      InventoryMovement.create({
        id: "res-movement-1",
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        warehouseId: ctx.warehouse1.id,
        productId: ctx.trackedProduct.id,
        productVariantId: null,
        type: "RESERVATION",
        quantity: "8.0000",
        reason: null,
        referenceType: "RESERVATION",
        referenceId: "res-1",
        correlationId: "corr-1",
        createdByUserId: "user-1",
        createdAt: new Date(),
      }),
    );

    await expect(
      adjust.execute({ ...base, direction: "DECREASE", quantity: "5.0000", reason: "Count discrepancy" }),
    ).rejects.toThrow(InsufficientInventoryError);
  });
});
