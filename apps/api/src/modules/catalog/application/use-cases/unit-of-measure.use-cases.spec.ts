import { InMemoryUnitOfMeasureRepository } from "../../test-support/in-memory-unit-of-measure.repository";
import { CreateUnitOfMeasureUseCase } from "./create-unit-of-measure.use-case";
import { UpdateUnitOfMeasureUseCase } from "./update-unit-of-measure.use-case";
import { ListUnitsOfMeasureUseCase } from "./list-units-of-measure.use-case";
import { SetUnitOfMeasureStatusUseCase } from "./set-unit-of-measure-status.use-case";
import { UnitOfMeasureCodeAlreadyInUseError, UnitOfMeasureNotFoundError } from "../errors";

function buildContext() {
  const units = new InMemoryUnitOfMeasureRepository();
  return {
    units,
    createUnit: new CreateUnitOfMeasureUseCase(units),
    updateUnit: new UpdateUnitOfMeasureUseCase(units),
    listUnits: new ListUnitsOfMeasureUseCase(units),
    setStatus: new SetUnitOfMeasureStatusUseCase(units),
  };
}

describe("Unit of Measure use cases", () => {
  it("creates a unit of measure", async () => {
    const { createUnit } = buildContext();
    const unit = await createUnit.execute({ tenantId: "t1", companyId: "c1", code: "UN", name: "Unidad", symbol: "u" });
    expect(unit.code).toBe("UN");
  });

  it("rejects a duplicate code within the same company", async () => {
    const { createUnit } = buildContext();
    await createUnit.execute({ tenantId: "t1", companyId: "c1", code: "UN", name: "Unidad", symbol: "u" });
    await expect(
      createUnit.execute({ tenantId: "t1", companyId: "c1", code: "UN", name: "Otra", symbol: "u" }),
    ).rejects.toThrow(UnitOfMeasureCodeAlreadyInUseError);
  });

  it("allows the same code in a different company", async () => {
    const { createUnit } = buildContext();
    await createUnit.execute({ tenantId: "t1", companyId: "c1", code: "UN", name: "Unidad", symbol: "u" });
    await expect(
      createUnit.execute({ tenantId: "t1", companyId: "c2", code: "UN", name: "Unidad", symbol: "u" }),
    ).resolves.toBeDefined();
  });

  it("updates a unit of measure", async () => {
    const { createUnit, updateUnit } = buildContext();
    const unit = await createUnit.execute({ tenantId: "t1", companyId: "c1", code: "UN", name: "Unidad", symbol: "u" });
    const updated = await updateUnit.execute({ tenantId: "t1", companyId: "c1", id: unit.id, name: "Unidades", symbol: "und" });
    expect(updated.name).toBe("Unidades");
  });

  it("rejects updating a unit from a different company as not found", async () => {
    const { createUnit, updateUnit } = buildContext();
    const unit = await createUnit.execute({ tenantId: "t1", companyId: "c1", code: "UN", name: "Unidad", symbol: "u" });
    await expect(
      updateUnit.execute({ tenantId: "t1", companyId: "c2", id: unit.id, name: "X", symbol: "x" }),
    ).rejects.toThrow(UnitOfMeasureNotFoundError);
  });

  it("lists units scoped to a company", async () => {
    const { createUnit, listUnits } = buildContext();
    await createUnit.execute({ tenantId: "t1", companyId: "c1", code: "UN", name: "Unidad", symbol: "u" });
    await createUnit.execute({ tenantId: "t1", companyId: "c2", code: "KG", name: "Kilogramo", symbol: "kg" });
    expect(await listUnits.execute("t1", "c1")).toHaveLength(1);
  });

  it("toggles status", async () => {
    const { createUnit, setStatus } = buildContext();
    const unit = await createUnit.execute({ tenantId: "t1", companyId: "c1", code: "UN", name: "Unidad", symbol: "u" });
    const updated = await setStatus.execute({ tenantId: "t1", companyId: "c1", id: unit.id, status: "INACTIVE" });
    expect(updated.status).toBe("INACTIVE");
  });
});
