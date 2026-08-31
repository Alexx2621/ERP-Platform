import { InMemoryBrandRepository } from "../../test-support/in-memory-brand.repository";
import { CreateBrandUseCase } from "./create-brand.use-case";
import { UpdateBrandUseCase } from "./update-brand.use-case";
import { ListBrandsUseCase } from "./list-brands.use-case";
import { SetBrandStatusUseCase } from "./set-brand-status.use-case";
import { BrandCodeAlreadyInUseError, BrandNotFoundError } from "../errors";

function buildContext() {
  const brands = new InMemoryBrandRepository();
  return {
    createBrand: new CreateBrandUseCase(brands),
    updateBrand: new UpdateBrandUseCase(brands),
    listBrands: new ListBrandsUseCase(brands),
    setStatus: new SetBrandStatusUseCase(brands),
  };
}

describe("Brand use cases", () => {
  it("creates a brand", async () => {
    const { createBrand } = buildContext();
    const brand = await createBrand.execute({ tenantId: "t1", companyId: "c1", code: "ACME", name: "Acme" });
    expect(brand.code).toBe("ACME");
  });

  it("rejects a duplicate code within the same company", async () => {
    const { createBrand } = buildContext();
    await createBrand.execute({ tenantId: "t1", companyId: "c1", code: "ACME", name: "Acme" });
    await expect(
      createBrand.execute({ tenantId: "t1", companyId: "c1", code: "ACME", name: "Otra" }),
    ).rejects.toThrow(BrandCodeAlreadyInUseError);
  });

  it("updates a brand", async () => {
    const { createBrand, updateBrand } = buildContext();
    const brand = await createBrand.execute({ tenantId: "t1", companyId: "c1", code: "ACME", name: "Acme" });
    const updated = await updateBrand.execute({ tenantId: "t1", companyId: "c1", id: brand.id, name: "Acme Inc." });
    expect(updated.name).toBe("Acme Inc.");
  });

  it("rejects updating a brand from a different company as not found", async () => {
    const { createBrand, updateBrand } = buildContext();
    const brand = await createBrand.execute({ tenantId: "t1", companyId: "c1", code: "ACME", name: "Acme" });
    await expect(
      updateBrand.execute({ tenantId: "t1", companyId: "c2", id: brand.id, name: "X" }),
    ).rejects.toThrow(BrandNotFoundError);
  });

  it("lists brands scoped to a company", async () => {
    const { createBrand, listBrands } = buildContext();
    await createBrand.execute({ tenantId: "t1", companyId: "c1", code: "ACME", name: "Acme" });
    await createBrand.execute({ tenantId: "t1", companyId: "c2", code: "OTHER", name: "Other" });
    expect(await listBrands.execute("t1", "c1")).toHaveLength(1);
  });

  it("toggles status", async () => {
    const { createBrand, setStatus } = buildContext();
    const brand = await createBrand.execute({ tenantId: "t1", companyId: "c1", code: "ACME", name: "Acme" });
    const updated = await setStatus.execute({ tenantId: "t1", companyId: "c1", id: brand.id, status: "INACTIVE" });
    expect(updated.status).toBe("INACTIVE");
  });
});
