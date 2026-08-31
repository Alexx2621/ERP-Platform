import { InMemorySupplierRepository } from "../../test-support/in-memory-supplier.repository";
import { CreateSupplierUseCase } from "./create-supplier.use-case";
import { UpdateSupplierUseCase } from "./update-supplier.use-case";
import { ListSuppliersUseCase } from "./list-suppliers.use-case";
import { SetSupplierStatusUseCase } from "./set-supplier-status.use-case";
import { SupplierCodeAlreadyInUseError, SupplierNotFoundError, SupplierTaxIdAlreadyInUseError } from "../errors";

function buildContext() {
  const suppliers = new InMemorySupplierRepository();
  return {
    suppliers,
    createSupplier: new CreateSupplierUseCase(suppliers),
    updateSupplier: new UpdateSupplierUseCase(suppliers),
    listSuppliers: new ListSuppliersUseCase(suppliers),
    setStatus: new SetSupplierStatusUseCase(suppliers),
  };
}

describe("Supplier use cases", () => {
  it("creates a supplier", async () => {
    const { createSupplier } = buildContext();
    const supplier = await createSupplier.execute({ tenantId: "t1", companyId: "c1", code: "SUPP-01", name: "Textiles del Norte" });
    expect(supplier.code).toBe("SUPP-01");
    expect(supplier.status).toBe("ACTIVE");
  });

  it("rejects a duplicate code within the same company", async () => {
    const { createSupplier } = buildContext();
    await createSupplier.execute({ tenantId: "t1", companyId: "c1", code: "SUPP-01", name: "Textiles del Norte" });
    await expect(
      createSupplier.execute({ tenantId: "t1", companyId: "c1", code: "SUPP-01", name: "Other" }),
    ).rejects.toThrow(SupplierCodeAlreadyInUseError);
  });

  it("allows the same code in a different company", async () => {
    const { createSupplier } = buildContext();
    await createSupplier.execute({ tenantId: "t1", companyId: "c1", code: "SUPP-01", name: "Textiles del Norte" });
    await expect(
      createSupplier.execute({ tenantId: "t1", companyId: "c2", code: "SUPP-01", name: "Textiles del Norte" }),
    ).resolves.toBeDefined();
  });

  it("rejects a duplicate tax id within the same company", async () => {
    const { createSupplier } = buildContext();
    await createSupplier.execute({ tenantId: "t1", companyId: "c1", code: "SUPP-01", name: "Textiles del Norte", taxId: "TAX-1" });
    await expect(
      createSupplier.execute({ tenantId: "t1", companyId: "c1", code: "SUPP-02", name: "Other", taxId: "TAX-1" }),
    ).rejects.toThrow(SupplierTaxIdAlreadyInUseError);
  });

  it("allows multiple suppliers with no tax id in the same company", async () => {
    const { createSupplier } = buildContext();
    await createSupplier.execute({ tenantId: "t1", companyId: "c1", code: "SUPP-01", name: "Textiles del Norte" });
    await expect(
      createSupplier.execute({ tenantId: "t1", companyId: "c1", code: "SUPP-02", name: "Other" }),
    ).resolves.toBeDefined();
  });

  it("updates a supplier's fields", async () => {
    const { createSupplier, updateSupplier } = buildContext();
    const supplier = await createSupplier.execute({ tenantId: "t1", companyId: "c1", code: "SUPP-01", name: "Textiles del Norte" });
    const updated = await updateSupplier.execute({
      tenantId: "t1",
      companyId: "c1",
      id: supplier.id,
      name: "Textiles del Norte S.A.",
      phone: "+50287654321",
    });
    expect(updated.name).toBe("Textiles del Norte S.A.");
    expect(updated.phone).toBe("+50287654321");
  });

  it("keeps taxId/phone unchanged when omitted from an update, and clears them when sent as an empty string", async () => {
    const { createSupplier, updateSupplier } = buildContext();
    const supplier = await createSupplier.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "SUPP-01",
      name: "Textiles del Norte",
      taxId: "TAX-1",
      phone: "+50287654321",
    });

    const keptUpdate = await updateSupplier.execute({ tenantId: "t1", companyId: "c1", id: supplier.id, name: "Textiles del Norte" });
    expect(keptUpdate.taxId).toBe("TAX-1");
    expect(keptUpdate.phone).toBe("+50287654321");

    const clearedUpdate = await updateSupplier.execute({
      tenantId: "t1",
      companyId: "c1",
      id: supplier.id,
      name: "Textiles del Norte",
      taxId: "",
      phone: "",
    });
    expect(clearedUpdate.taxId).toBeNull();
    expect(clearedUpdate.phone).toBeNull();
  });

  it("rejects updating a supplier from a different company as not found", async () => {
    const { createSupplier, updateSupplier } = buildContext();
    const supplier = await createSupplier.execute({ tenantId: "t1", companyId: "c1", code: "SUPP-01", name: "Textiles del Norte" });
    await expect(
      updateSupplier.execute({ tenantId: "t1", companyId: "c2", id: supplier.id, name: "X" }),
    ).rejects.toThrow(SupplierNotFoundError);
  });

  it("lists suppliers scoped to a company", async () => {
    const { createSupplier, listSuppliers } = buildContext();
    await createSupplier.execute({ tenantId: "t1", companyId: "c1", code: "SUPP-01", name: "Textiles del Norte" });
    await createSupplier.execute({ tenantId: "t1", companyId: "c2", code: "SUPP-02", name: "Other" });
    expect(await listSuppliers.execute("t1", "c1")).toHaveLength(1);
  });

  it("toggles status", async () => {
    const { createSupplier, setStatus } = buildContext();
    const supplier = await createSupplier.execute({ tenantId: "t1", companyId: "c1", code: "SUPP-01", name: "Textiles del Norte" });
    const updated = await setStatus.execute({ tenantId: "t1", companyId: "c1", id: supplier.id, status: "INACTIVE" });
    expect(updated.status).toBe("INACTIVE");
  });
});
