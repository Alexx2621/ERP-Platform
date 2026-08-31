import { buildInventoryTestContext } from "../../test-support/build-inventory-test-context";
import { RecordReceiptUseCase } from "./record-receipt.use-case";
import { RecordIssueUseCase } from "./record-issue.use-case";
import { CreateReservationUseCase } from "./create-reservation.use-case";
import { ReleaseReservationUseCase } from "./release-reservation.use-case";
import { InsufficientInventoryError, InventoryReservationNotActiveError, InventoryReservationNotFoundError } from "../errors";

async function buildUseCases(ctx: Awaited<ReturnType<typeof buildInventoryTestContext>>) {
  return {
    receipt: new RecordReceiptUseCase(ctx.balances, ctx.resolveWarehouse, ctx.resolveProduct),
    issue: new RecordIssueUseCase(ctx.balances, ctx.resolveWarehouse, ctx.resolveProduct),
    createReservation: new CreateReservationUseCase(ctx.balances, ctx.reservations, ctx.resolveWarehouse, ctx.resolveProduct),
    releaseReservation: new ReleaseReservationUseCase(ctx.reservations, ctx.balances),
  };
}

describe("CreateReservationUseCase", () => {
  it("earmarks stock without touching on-hand quantity", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt, createReservation } = await buildUseCases(ctx);
    const base = {
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
    };
    await receipt.execute({ ...base, quantity: "20.0000" });
    const { reservation, movement } = await createReservation.execute({ ...base, quantity: "8.0000" });

    expect(movement.type).toBe("RESERVATION");
    expect(reservation.status).toBe("ACTIVE");
    expect(reservation.quantity).toBe("8.0000");

    const [balance] = await ctx.balances.listByCompany(ctx.tenantId, ctx.companyId, { warehouseId: ctx.warehouse1.id });
    expect(balance.onHandQuantity).toBe("20.0000");
    expect(balance.reservedQuantity).toBe("8.0000");
    expect(balance.availableQuantity).toBe("12.0000");
  });

  it("rejects reserving more than is available (never creates the reservation row)", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt, createReservation } = await buildUseCases(ctx);
    const base = {
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
    };
    await receipt.execute({ ...base, quantity: "5.0000" });
    await expect(createReservation.execute({ ...base, quantity: "10.0000" })).rejects.toThrow(InsufficientInventoryError);

    const [balance] = await ctx.balances.listByCompany(ctx.tenantId, ctx.companyId, { warehouseId: ctx.warehouse1.id });
    expect(balance.reservedQuantity).toBe("0.0000");
  });

  it("rejects reserving with zero stock at all", async () => {
    const ctx = await buildInventoryTestContext();
    const { createReservation } = await buildUseCases(ctx);
    await expect(
      createReservation.execute({
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

describe("ReleaseReservationUseCase", () => {
  it("frees the entire reserved quantity back into available stock", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt, createReservation, releaseReservation } = await buildUseCases(ctx);
    const base = {
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
    };
    await receipt.execute({ ...base, quantity: "20.0000" });
    const { reservation } = await createReservation.execute({ ...base, quantity: "8.0000" });

    const { reservation: released, movement } = await releaseReservation.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-2",
      reservationId: reservation.id,
    });

    expect(released.status).toBe("RELEASED");
    expect(movement.type).toBe("RELEASE");
    expect(movement.quantity).toBe("-8.0000");

    const [balance] = await ctx.balances.listByCompany(ctx.tenantId, ctx.companyId, { warehouseId: ctx.warehouse1.id });
    expect(balance.reservedQuantity).toBe("0.0000");
    expect(balance.availableQuantity).toBe("20.0000");
  });

  it("rejects releasing an unknown reservation", async () => {
    const ctx = await buildInventoryTestContext();
    const { releaseReservation } = await buildUseCases(ctx);
    await expect(
      releaseReservation.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: "user-1",
        correlationId: "corr-1",
        reservationId: "missing",
      }),
    ).rejects.toThrow(InventoryReservationNotFoundError);
  });

  it("rejects releasing an already-released reservation", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt, createReservation, releaseReservation } = await buildUseCases(ctx);
    const base = {
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
    };
    await receipt.execute({ ...base, quantity: "20.0000" });
    const { reservation } = await createReservation.execute({ ...base, quantity: "8.0000" });
    await releaseReservation.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-2",
      reservationId: reservation.id,
    });

    await expect(
      releaseReservation.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        actorUserId: "user-1",
        correlationId: "corr-3",
        reservationId: reservation.id,
      }),
    ).rejects.toThrow(InventoryReservationNotActiveError);
  });

  it("rejects releasing a reservation from a different company (IDOR-resistant)", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt, createReservation, releaseReservation } = await buildUseCases(ctx);
    const base = {
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
    };
    await receipt.execute({ ...base, quantity: "20.0000" });
    const { reservation } = await createReservation.execute({ ...base, quantity: "8.0000" });

    await expect(
      releaseReservation.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.otherCompanyId,
        actorUserId: "user-1",
        correlationId: "corr-2",
        reservationId: reservation.id,
      }),
    ).rejects.toThrow(InventoryReservationNotFoundError);
  });

  it("prevents issuing stock that is currently reserved for something else", async () => {
    const ctx = await buildInventoryTestContext();
    const { receipt, issue, createReservation } = await buildUseCases(ctx);
    const base = {
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
    };
    await receipt.execute({ ...base, quantity: "10.0000" });
    await createReservation.execute({ ...base, quantity: "8.0000" });

    // Only 2 units are genuinely available (10 on-hand - 8 reserved).
    await expect(issue.execute({ ...base, quantity: "5.0000" })).rejects.toThrow(InsufficientInventoryError);
    await expect(issue.execute({ ...base, quantity: "2.0000" })).resolves.toBeDefined();
  });
});
