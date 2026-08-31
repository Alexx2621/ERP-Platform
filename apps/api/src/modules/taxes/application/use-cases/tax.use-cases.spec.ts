import { InMemoryTaxRepository } from "../../test-support/in-memory-tax.repository";
import { CreateTaxUseCase } from "./create-tax.use-case";
import { UpdateTaxUseCase } from "./update-tax.use-case";
import { ListTaxesUseCase } from "./list-taxes.use-case";
import { SetTaxStatusUseCase } from "./set-tax-status.use-case";
import { TaxCodeAlreadyInUseError, TaxNotFoundError } from "../errors";

function buildContext() {
  const taxes = new InMemoryTaxRepository();
  return {
    taxes,
    createTax: new CreateTaxUseCase(taxes),
    updateTax: new UpdateTaxUseCase(taxes),
    listTaxes: new ListTaxesUseCase(taxes),
    setStatus: new SetTaxStatusUseCase(taxes),
  };
}

describe("Tax use cases", () => {
  it("creates a tax", async () => {
    const { createTax } = buildContext();
    const tax = await createTax.execute({ tenantId: "t1", companyId: "c1", code: "IVA", name: "IVA", rate: "12.0000" });
    expect(tax.code).toBe("IVA");
    expect(tax.rate).toBe("12.0000");
  });

  it("rejects a duplicate code within the same company", async () => {
    const { createTax } = buildContext();
    await createTax.execute({ tenantId: "t1", companyId: "c1", code: "IVA", name: "IVA", rate: "12.0000" });
    await expect(
      createTax.execute({ tenantId: "t1", companyId: "c1", code: "IVA", name: "Otro", rate: "5.0000" }),
    ).rejects.toThrow(TaxCodeAlreadyInUseError);
  });

  it("allows the same code in a different company", async () => {
    const { createTax } = buildContext();
    await createTax.execute({ tenantId: "t1", companyId: "c1", code: "IVA", name: "IVA", rate: "12.0000" });
    await expect(
      createTax.execute({ tenantId: "t1", companyId: "c2", code: "IVA", name: "IVA", rate: "12.0000" }),
    ).resolves.toBeDefined();
  });

  it("updates a tax's name and rate", async () => {
    const { createTax, updateTax } = buildContext();
    const tax = await createTax.execute({ tenantId: "t1", companyId: "c1", code: "IVA", name: "IVA", rate: "12.0000" });
    const updated = await updateTax.execute({ tenantId: "t1", companyId: "c1", id: tax.id, name: "IVA General", rate: "13.0000" });
    expect(updated.name).toBe("IVA General");
    expect(updated.rate).toBe("13.0000");
  });

  it("rejects updating a tax from a different company as not found", async () => {
    const { createTax, updateTax } = buildContext();
    const tax = await createTax.execute({ tenantId: "t1", companyId: "c1", code: "IVA", name: "IVA", rate: "12.0000" });
    await expect(
      updateTax.execute({ tenantId: "t1", companyId: "c2", id: tax.id, name: "X", rate: "1.0000" }),
    ).rejects.toThrow(TaxNotFoundError);
  });

  it("lists taxes scoped to a company", async () => {
    const { createTax, listTaxes } = buildContext();
    await createTax.execute({ tenantId: "t1", companyId: "c1", code: "IVA", name: "IVA", rate: "12.0000" });
    await createTax.execute({ tenantId: "t1", companyId: "c2", code: "IVA", name: "IVA", rate: "12.0000" });
    expect(await listTaxes.execute("t1", "c1")).toHaveLength(1);
  });

  it("toggles status", async () => {
    const { createTax, setStatus } = buildContext();
    const tax = await createTax.execute({ tenantId: "t1", companyId: "c1", code: "IVA", name: "IVA", rate: "12.0000" });
    const updated = await setStatus.execute({ tenantId: "t1", companyId: "c1", id: tax.id, status: "INACTIVE" });
    expect(updated.status).toBe("INACTIVE");
  });
});
