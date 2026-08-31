import { InMemoryWarehouseRepository } from "../../test-support/in-memory-warehouse.repository";
import { CreateWarehouseUseCase } from "./create-warehouse.use-case";
import { UpdateWarehouseUseCase } from "./update-warehouse.use-case";
import { ListWarehousesUseCase } from "./list-warehouses.use-case";
import { SetWarehouseStatusUseCase } from "./set-warehouse-status.use-case";
import { WarehouseCodeAlreadyInUseError, WarehouseNotFoundError } from "../errors";

function buildContext() {
  const warehouses = new InMemoryWarehouseRepository();
  return {
    warehouses,
    createWarehouse: new CreateWarehouseUseCase(warehouses),
    updateWarehouse: new UpdateWarehouseUseCase(warehouses),
    listWarehouses: new ListWarehousesUseCase(warehouses),
    setStatus: new SetWarehouseStatusUseCase(warehouses),
  };
}

describe("Warehouse use cases", () => {
  it("creates a warehouse", async () => {
    const { createWarehouse } = buildContext();
    const warehouse = await createWarehouse.execute({ tenantId: "t1", companyId: "c1", code: "WH-01", name: "Bodega Central" });
    expect(warehouse.code).toBe("WH-01");
    expect(warehouse.status).toBe("ACTIVE");
  });

  it("rejects a duplicate code within the same company", async () => {
    const { createWarehouse } = buildContext();
    await createWarehouse.execute({ tenantId: "t1", companyId: "c1", code: "WH-01", name: "Bodega Central" });
    await expect(
      createWarehouse.execute({ tenantId: "t1", companyId: "c1", code: "WH-01", name: "Otra" }),
    ).rejects.toThrow(WarehouseCodeAlreadyInUseError);
  });

  it("allows the same code in a different company", async () => {
    const { createWarehouse } = buildContext();
    await createWarehouse.execute({ tenantId: "t1", companyId: "c1", code: "WH-01", name: "Bodega Central" });
    await expect(
      createWarehouse.execute({ tenantId: "t1", companyId: "c2", code: "WH-01", name: "Bodega Central" }),
    ).resolves.toBeDefined();
  });

  it("updates a warehouse's fields", async () => {
    const { createWarehouse, updateWarehouse } = buildContext();
    const warehouse = await createWarehouse.execute({ tenantId: "t1", companyId: "c1", code: "WH-01", name: "Bodega Central" });
    const updated = await updateWarehouse.execute({
      tenantId: "t1",
      companyId: "c1",
      id: warehouse.id,
      name: "Bodega Central Renovada",
      city: "Ciudad",
    });
    expect(updated.name).toBe("Bodega Central Renovada");
    expect(updated.city).toBe("Ciudad");
  });

  it("keeps city unchanged when omitted from an update, and clears it when sent as an empty string", async () => {
    const { createWarehouse, updateWarehouse } = buildContext();
    const warehouse = await createWarehouse.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "WH-01",
      name: "Bodega Central",
      city: "Ciudad",
    });

    const keptUpdate = await updateWarehouse.execute({ tenantId: "t1", companyId: "c1", id: warehouse.id, name: "Bodega Central" });
    expect(keptUpdate.city).toBe("Ciudad");

    const clearedUpdate = await updateWarehouse.execute({
      tenantId: "t1",
      companyId: "c1",
      id: warehouse.id,
      name: "Bodega Central",
      city: "",
    });
    expect(clearedUpdate.city).toBeNull();
  });

  it("rejects updating a warehouse from a different company as not found", async () => {
    const { createWarehouse, updateWarehouse } = buildContext();
    const warehouse = await createWarehouse.execute({ tenantId: "t1", companyId: "c1", code: "WH-01", name: "Bodega Central" });
    await expect(
      updateWarehouse.execute({ tenantId: "t1", companyId: "c2", id: warehouse.id, name: "X" }),
    ).rejects.toThrow(WarehouseNotFoundError);
  });

  it("lists warehouses scoped to a company", async () => {
    const { createWarehouse, listWarehouses } = buildContext();
    await createWarehouse.execute({ tenantId: "t1", companyId: "c1", code: "WH-01", name: "Bodega Central" });
    await createWarehouse.execute({ tenantId: "t1", companyId: "c2", code: "WH-02", name: "Otra" });
    expect(await listWarehouses.execute("t1", "c1")).toHaveLength(1);
  });

  it("toggles status", async () => {
    const { createWarehouse, setStatus } = buildContext();
    const warehouse = await createWarehouse.execute({ tenantId: "t1", companyId: "c1", code: "WH-01", name: "Bodega Central" });
    const updated = await setStatus.execute({ tenantId: "t1", companyId: "c1", id: warehouse.id, status: "INACTIVE" });
    expect(updated.status).toBe("INACTIVE");
  });
});
