import { Category } from "./category.entity";

const base = {
  id: "cat1",
  tenantId: "t1",
  companyId: "c1",
  parentId: null,
  status: "ACTIVE" as const,
  version: 1,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("Category", () => {
  it("rejects being its own parent", () => {
    expect(() =>
      Category.create({ ...base, parentId: "cat1", code: "ELEC", name: "Electrónica" }),
    ).toThrow();
  });

  it("reparent() rejects being its own parent", () => {
    const category = Category.create({ ...base, code: "ELEC", name: "Electrónica" });
    expect(() => category.reparent("cat1")).toThrow();
  });

  it("reparent(null) detaches from any parent", () => {
    const category = Category.create({ ...base, parentId: "parent-1", code: "ELEC", name: "Electrónica" });
    category.reparent(null);
    expect(category.parentId).toBeNull();
    expect(category.version).toBe(2);
  });

  it("rename() bumps version", () => {
    const category = Category.create({ ...base, code: "ELEC", name: "Electrónica" });
    category.rename("Electrónicos");
    expect(category.name).toBe("Electrónicos");
    expect(category.version).toBe(2);
  });
});
