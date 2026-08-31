import { buildInventoryTestContext } from "../../test-support/build-inventory-test-context";
import { RecordReceiptUseCase } from "./record-receipt.use-case";
import { CreateReservationUseCase } from "./create-reservation.use-case";
import { CreateTransferUseCase } from "./create-transfer.use-case";
import { ListInventoryBalancesUseCase } from "./list-inventory-balances.use-case";
import { ListInventoryMovementsUseCase } from "./list-inventory-movements.use-case";
import { ListInventoryReservationsUseCase } from "./list-inventory-reservations.use-case";
import { ListInventoryTransfersUseCase } from "./list-inventory-transfers.use-case";

describe("Inventory list use cases", () => {
  it("scope every list to the requesting company", async () => {
    const ctx = await buildInventoryTestContext();
    const receipt = new RecordReceiptUseCase(ctx.balances, ctx.resolveWarehouse, ctx.resolveProduct);
    const createReservation = new CreateReservationUseCase(ctx.balances, ctx.reservations, ctx.resolveWarehouse, ctx.resolveProduct);
    const createTransfer = new CreateTransferUseCase(ctx.balances, ctx.transfers, ctx.resolveWarehouse, ctx.resolveProduct);
    const listBalances = new ListInventoryBalancesUseCase(ctx.balances);
    const listMovements = new ListInventoryMovementsUseCase(ctx.movements);
    const listReservations = new ListInventoryReservationsUseCase(ctx.reservations);
    const listTransfers = new ListInventoryTransfersUseCase(ctx.transfers);

    const base = {
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
    };
    await receipt.execute({ ...base, quantity: "20.0000" });
    await createReservation.execute({ ...base, quantity: "5.0000" });
    await createTransfer.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-2",
      productId: ctx.trackedProduct.id,
      sourceWarehouseId: ctx.warehouse1.id,
      destinationWarehouseId: ctx.warehouse2.id,
      quantity: "3.0000",
    });

    const balances = await listBalances.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: {} });
    expect(balances).toHaveLength(1);

    const movements = await listMovements.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 100 } });
    expect(movements).toHaveLength(3); // RECEIPT, RESERVATION, TRANSFER_OUT

    const reservations = await listReservations.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 100 } });
    expect(reservations).toHaveLength(1);

    const transfers = await listTransfers.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 100 } });
    expect(transfers).toHaveLength(1);

    // Cross-company isolation: the other company sees nothing.
    expect(
      await listBalances.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, filter: {} }),
    ).toHaveLength(0);
    expect(
      await listMovements.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, filter: { limit: 100 } }),
    ).toHaveLength(0);
  });

  it("filters transfers by warehouseId matching either source or destination", async () => {
    const ctx = await buildInventoryTestContext();
    const receipt = new RecordReceiptUseCase(ctx.balances, ctx.resolveWarehouse, ctx.resolveProduct);
    const createTransfer = new CreateTransferUseCase(ctx.balances, ctx.transfers, ctx.resolveWarehouse, ctx.resolveProduct);
    const listTransfers = new ListInventoryTransfersUseCase(ctx.transfers);

    await receipt.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-1",
      warehouseId: ctx.warehouse1.id,
      productId: ctx.trackedProduct.id,
      quantity: "10.0000",
    });
    await createTransfer.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      actorUserId: "user-1",
      correlationId: "corr-2",
      productId: ctx.trackedProduct.id,
      sourceWarehouseId: ctx.warehouse1.id,
      destinationWarehouseId: ctx.warehouse2.id,
      quantity: "3.0000",
    });

    const byDestination = await listTransfers.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      filter: { warehouseId: ctx.warehouse2.id, limit: 100 },
    });
    expect(byDestination).toHaveLength(1);
  });
});
