import { InMemoryCategoryRepository } from "../../test-support/in-memory-category.repository";
import { CreateCategoryUseCase } from "./create-category.use-case";
import { UpdateCategoryUseCase } from "./update-category.use-case";
import { ListCategoriesUseCase } from "./list-categories.use-case";
import { SetCategoryStatusUseCase } from "./set-category-status.use-case";
import { CategoryCodeAlreadyInUseError, CategoryNotFoundError, CategoryParentNotFoundError } from "../errors";

function buildContext() {
  const categories = new InMemoryCategoryRepository();
  return {
    categories,
    createCategory: new CreateCategoryUseCase(categories),
    updateCategory: new UpdateCategoryUseCase(categories),
    listCategories: new ListCategoriesUseCase(categories),
    setStatus: new SetCategoryStatusUseCase(categories),
  };
}

describe("Category use cases", () => {
  it("creates a root category", async () => {
    const { createCategory } = buildContext();
    const category = await createCategory.execute({ tenantId: "t1", companyId: "c1", code: "ELEC", name: "Electrónica" });
    expect(category.parentId).toBeNull();
  });

  it("creates a nested category under a real parent", async () => {
    const { createCategory } = buildContext();
    const parent = await createCategory.execute({ tenantId: "t1", companyId: "c1", code: "ELEC", name: "Electrónica" });
    const child = await createCategory.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "PHONES",
      name: "Teléfonos",
      parentId: parent.id,
    });
    expect(child.parentId).toBe(parent.id);
  });

  it("rejects a parent from a different company", async () => {
    const { createCategory } = buildContext();
    const parent = await createCategory.execute({ tenantId: "t1", companyId: "c1", code: "ELEC", name: "Electrónica" });
    await expect(
      createCategory.execute({ tenantId: "t1", companyId: "c2", code: "PHONES", name: "Teléfonos", parentId: parent.id }),
    ).rejects.toThrow(CategoryParentNotFoundError);
  });

  it("rejects a duplicate code within the same company", async () => {
    const { createCategory } = buildContext();
    await createCategory.execute({ tenantId: "t1", companyId: "c1", code: "ELEC", name: "Electrónica" });
    await expect(
      createCategory.execute({ tenantId: "t1", companyId: "c1", code: "ELEC", name: "Otra" }),
    ).rejects.toThrow(CategoryCodeAlreadyInUseError);
  });

  it("updates name and re-parents", async () => {
    const { createCategory, updateCategory } = buildContext();
    const parent = await createCategory.execute({ tenantId: "t1", companyId: "c1", code: "ELEC", name: "Electrónica" });
    const child = await createCategory.execute({ tenantId: "t1", companyId: "c1", code: "PHONES", name: "Teléfonos" });
    const updated = await updateCategory.execute({
      tenantId: "t1",
      companyId: "c1",
      id: child.id,
      name: "Celulares",
      parentId: parent.id,
    });
    expect(updated.name).toBe("Celulares");
    expect(updated.parentId).toBe(parent.id);
  });

  it("detaches from parent when parentId is explicitly null", async () => {
    const { createCategory, updateCategory } = buildContext();
    const parent = await createCategory.execute({ tenantId: "t1", companyId: "c1", code: "ELEC", name: "Electrónica" });
    const child = await createCategory.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "PHONES",
      name: "Teléfonos",
      parentId: parent.id,
    });
    const updated = await updateCategory.execute({ tenantId: "t1", companyId: "c1", id: child.id, name: "Teléfonos", parentId: null });
    expect(updated.parentId).toBeNull();
  });

  it("lists categories scoped to a company", async () => {
    const { createCategory, listCategories } = buildContext();
    await createCategory.execute({ tenantId: "t1", companyId: "c1", code: "ELEC", name: "Electrónica" });
    await createCategory.execute({ tenantId: "t1", companyId: "c2", code: "FOOD", name: "Alimentos" });
    expect(await listCategories.execute("t1", "c1")).toHaveLength(1);
  });

  it("rejects updating a category from a different company as not found", async () => {
    const { createCategory, updateCategory } = buildContext();
    const category = await createCategory.execute({ tenantId: "t1", companyId: "c1", code: "ELEC", name: "Electrónica" });
    await expect(
      updateCategory.execute({ tenantId: "t1", companyId: "c2", id: category.id, name: "X" }),
    ).rejects.toThrow(CategoryNotFoundError);
  });

  it("toggles status", async () => {
    const { createCategory, setStatus } = buildContext();
    const category = await createCategory.execute({ tenantId: "t1", companyId: "c1", code: "ELEC", name: "Electrónica" });
    const updated = await setStatus.execute({ tenantId: "t1", companyId: "c1", id: category.id, status: "INACTIVE" });
    expect(updated.status).toBe("INACTIVE");
  });
});
