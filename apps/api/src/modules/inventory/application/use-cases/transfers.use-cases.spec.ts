import { buildInventoryTestContext } from "../../test-support/build-inventory-test-context";
import { RecordReceiptUseCase } from "./record-receipt.use-case";
import { CreateTransferUseCase } from "./create-transfer.use-case";
import { CompleteTransferUseCase } from "./complete-transfer.use-case";
import { CancelTransferUseCase } from "./cancel-transfer.use-case";
import {
  InsufficientInventoryError,
  InventoryTransferNotFoundError,
  InventoryTransferNotInTransitError,
  SameWarehouseTransferError,
} from "../errors";

async function buildUseCases(ctx: Awaited<ReturnType<typeof buildInventoryTestContext>>) {
  return {
    receipt: new RecordReceiptUseCase(ctx.balances, ctx.resolveWarehouse, ctx.resolveProduct),
    createTransfer: new CreateTransferUseCase(ctx.balances, ctx.transfers, ctx.resolveWarehouse, ctx.resolveProduct),
    completeTransfer: new CompleteTransferUseCase(ctx.transfers, ctx.balances),
    cancelTransfer: new CancelTransferUseCase(ctx.transfers, ctx.balances),
  };
}

describe("CreateTransferUseCase", () => {
  it("posts a TRANSFER_OUT at the source immediately, decreasing its on-hand", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt, createTransfer } = await buildUseCases(ctx);
    await receipt.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
      quantity: "20.0000",
    });

    const { transfer, movement } = await createTransfer.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-2",
      productId: ctx.trackedProduct.id,
      sourceWarehouseId: ctx.warehouse1.id,
      destinationWarehouseId: ctx.warehouse2.id,
      quantity: "8.0000",
    });

    expect(transfer.status).toBe("IN_TRANSIT");
    expect(movement.type).toBe("TRANSFER_OUT");
    expect(movement.quantity).toBe("-8.0000");

    const [sourceBalance] = await ctx.balances.listByCompany(ctx.tenantId, ctx.companyId, { warehouseId: ctx.warehouse1.id });
    expect(sourceBalance.onHandQuantity).toBe("12.0000");
    const destinationBalances = await ctx.balances.listByCompany(ctx.tenantId, ctx.companyId, { warehouseId: ctx.warehouse2.id });
    expect(destinationBalances).toHaveLength(0);
  });

  it("rejects a transfer between the same warehouse", async () => {
    const ctx = await buildInventoryTestContext();
    const { createTransfer } = await buildUseCases(ctx);
    await expect(
      createTransfer.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: "user-1",
        correlationId: "corr-1",
        productId: ctx.trackedProduct.id,
        sourceWarehouseId: ctx.warehouse1.id,
        destinationWarehouseId: ctx.warehouse1.id,
        quantity: "1.0000",
      }),
    ).rejects.toThrow(SameWarehouseTransferError);
  });

  it("rejects a transfer that would leave the source with insufficient stock", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt, createTransfer } = await buildUseCases(ctx);
    await receipt.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
      quantity: "5.0000",
    });

    await expect(
      createTransfer.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: "user-1",
        correlationId: "corr-2",
        productId: ctx.trackedProduct.id,
        sourceWarehouseId: ctx.warehouse1.id,
        destinationWarehouseId: ctx.warehouse2.id,
        quantity: "10.0000",
      }),
    ).rejects.toThrow(InsufficientInventoryError);
  });
});

describe("CompleteTransferUseCase", () => {
  it("posts a TRANSFER_IN at the destination and marks the transfer COMPLETED", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt, createTransfer, completeTransfer } = await buildUseCases(ctx);
    await receipt.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
      quantity: "20.0000",
    });
    const { transfer } = await createTransfer.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-2",
      productId: ctx.trackedProduct.id,
      sourceWarehouseId: ctx.warehouse1.id,
      destinationWarehouseId: ctx.warehouse2.id,
      quantity: "8.0000",
    });

    const { transfer: completed, movement } = await completeTransfer.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-3",
      transferId: transfer.id,
    });

    expect(completed.status).toBe("COMPLETED");
    expect(movement.type).toBe("TRANSFER_IN");
    expect(movement.quantity).toBe("8.0000");
    expect(movement.warehouseId).toBe(ctx.warehouse2.id);

    const [destinationBalance] = await ctx.balances.listByCompany(ctx.tenantId, ctx.companyId, {
      warehouseId: ctx.warehouse2.id,
    });
    expect(destinationBalance.onHandQuantity).toBe("8.0000");
  });

  it("rejects completing a transfer that is not IN_TRANSIT", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt, createTransfer, completeTransfer } = await buildUseCases(ctx);
    await receipt.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
      quantity: "20.0000",
    });
    const { transfer } = await createTransfer.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-2",
      productId: ctx.trackedProduct.id,
      sourceWarehouseId: ctx.warehouse1.id,
      destinationWarehouseId: ctx.warehouse2.id,
      quantity: "8.0000",
    });
    await completeTransfer.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-3",
      transferId: transfer.id,
    });

    await expect(
      completeTransfer.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: "user-1",
        correlationId: "corr-4",
        transferId: transfer.id,
      }),
    ).rejects.toThrow(InventoryTransferNotInTransitError);
  });

  it("rejects completing an unknown transfer", async () => {
    const ctx = await buildInventoryTestContext();
    const { completeTransfer } = await buildUseCases(ctx);
    await expect(
      completeTransfer.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: "user-1",
        correlationId: "corr-1",
        transferId: "missing",
      }),
    ).rejects.toThrow(InventoryTransferNotFoundError);
  });
});

describe("CancelTransferUseCase", () => {
  it("posts a TRANSFER_CANCELLED at the source, restoring its on-hand, and marks the transfer CANCELLED", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt, createTransfer, cancelTransfer } = await buildUseCases(ctx);
    await receipt.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
      quantity: "20.0000",
    });
    const { transfer } = await createTransfer.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-2",
      productId: ctx.trackedProduct.id,
      sourceWarehouseId: ctx.warehouse1.id,
      destinationWarehouseId: ctx.warehouse2.id,
      quantity: "8.0000",
    });

    const { transfer: cancelled, movement } = await cancelTransfer.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-3",
      transferId: transfer.id,
    });

    expect(cancelled.status).toBe("CANCELLED");
    expect(movement.type).toBe("TRANSFER_CANCELLED");
    expect(movement.quantity).toBe("8.0000");
    expect(movement.warehouseId).toBe(ctx.warehouse1.id);

    const [sourceBalance] = await ctx.balances.listByCompany(ctx.tenantId, ctx.companyId, { warehouseId: ctx.warehouse1.id });
    expect(sourceBalance.onHandQuantity).toBe("20.0000");

    // Original TRANSFER_OUT row is never edited/deleted — the ledger has 3 rows: RECEIPT, TRANSFER_OUT, TRANSFER_CANCELLED.
    expect(ctx.movements.items).toHaveLength(3);
  });

  it("rejects cancelling a transfer that is not IN_TRANSIT", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt, createTransfer, cancelTransfer } = await buildUseCases(ctx);
    await receipt.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
      quantity: "20.0000",
    });
    const { transfer } = await createTransfer.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-2",
      productId: ctx.trackedProduct.id,
      sourceWarehouseId: ctx.warehouse1.id,
      destinationWarehouseId: ctx.warehouse2.id,
      quantity: "8.0000",
    });
    await cancelTransfer.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-3",
      transferId: transfer.id,
    });

    await expect(
      cancelTransfer.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: "user-1",
        correlationId: "corr-4",
        transferId: transfer.id,
      }),
    ).rejects.toThrow(InventoryTransferNotInTransitError);
  });
});
