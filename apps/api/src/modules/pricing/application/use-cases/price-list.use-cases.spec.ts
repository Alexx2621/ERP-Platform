import { InMemoryPriceListRepository } from "../../test-support/in-memory-price-list.repository";
import { CreatePriceListUseCase } from "./create-price-list.use-case";
import { UpdatePriceListUseCase } from "./update-price-list.use-case";
import { ListPriceListsUseCase } from "./list-price-lists.use-case";
import { SetPriceListStatusUseCase } from "./set-price-list-status.use-case";
import { PriceListCodeAlreadyInUseError, PriceListNotFoundError } from "../errors";

function buildContext() {
  const priceLists = new InMemoryPriceListRepository();
  return {
    priceLists,
    createPriceList: new CreatePriceListUseCase(priceLists),
    updatePriceList: new UpdatePriceListUseCase(priceLists),
    listPriceLists: new ListPriceListsUseCase(priceLists),
    setStatus: new SetPriceListStatusUseCase(priceLists),
  };
}

describe("PriceList use cases", () => {
  it("creates a price list", async () => {
    const { createPriceList } = buildContext();
    const priceList = await createPriceList.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "WHOLESALE",
      name: "Mayoreo",
      currency: "USD",
    });
    expect(priceList.code).toBe("WHOLESALE");
    expect(priceList.status).toBe("ACTIVE");
  });

  it("creates a price list with a validity window", async () => {
    const { createPriceList } = buildContext();
    const priceList = await createPriceList.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "PROMO",
      name: "Promoción",
      currency: "USD",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
    });
    expect(priceList.validFrom).toEqual(new Date("2026-01-01"));
    expect(priceList.validUntil).toEqual(new Date("2026-12-31"));
  });

  it("rejects a duplicate code within the same company", async () => {
    const { createPriceList } = buildContext();
    await createPriceList.execute({ tenantId: "t1", companyId: "c1", code: "WHOLESALE", name: "Mayoreo", currency: "USD" });
    await expect(
      createPriceList.execute({ tenantId: "t1", companyId: "c1", code: "WHOLESALE", name: "Otro", currency: "USD" }),
    ).rejects.toThrow(PriceListCodeAlreadyInUseError);
  });

  it("allows the same code in a different company", async () => {
    const { createPriceList } = buildContext();
    await createPriceList.execute({ tenantId: "t1", companyId: "c1", code: "WHOLESALE", name: "Mayoreo", currency: "USD" });
    await expect(
      createPriceList.execute({ tenantId: "t1", companyId: "c2", code: "WHOLESALE", name: "Mayoreo", currency: "USD" }),
    ).resolves.toBeDefined();
  });

  it("updates a price list's fields, including the three-state validity contract", async () => {
    const { createPriceList, updatePriceList } = buildContext();
    const priceList = await createPriceList.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "PROMO",
      name: "Promoción",
      currency: "USD",
      validFrom: "2026-01-01",
    });

    const kept = await updatePriceList.execute({
      tenantId: "t1",
      companyId: "c1",
      id: priceList.id,
      name: "Promoción",
      currency: "USD",
    });
    expect(kept.validFrom).toEqual(new Date("2026-01-01"));

    const cleared = await updatePriceList.execute({
      tenantId: "t1",
      companyId: "c1",
      id: priceList.id,
      name: "Promoción",
      currency: "USD",
      validFrom: "",
    });
    expect(cleared.validFrom).toBeNull();
  });

  it("rejects updating a price list from a different company as not found", async () => {
    const { createPriceList, updatePriceList } = buildContext();
    const priceList = await createPriceList.execute({ tenantId: "t1", companyId: "c1", code: "WHOLESALE", name: "Mayoreo", currency: "USD" });
    await expect(
      updatePriceList.execute({ tenantId: "t1", companyId: "c2", id: priceList.id, name: "X", currency: "USD" }),
    ).rejects.toThrow(PriceListNotFoundError);
  });

  it("lists price lists scoped to a company", async () => {
    const { createPriceList, listPriceLists } = buildContext();
    await createPriceList.execute({ tenantId: "t1", companyId: "c1", code: "WHOLESALE", name: "Mayoreo", currency: "USD" });
    await createPriceList.execute({ tenantId: "t1", companyId: "c2", code: "RETAIL", name: "Menudeo", currency: "USD" });
    expect(await listPriceLists.execute("t1", "c1")).toHaveLength(1);
  });

  it("toggles status", async () => {
    const { createPriceList, setStatus } = buildContext();
    const priceList = await createPriceList.execute({ tenantId: "t1", companyId: "c1", code: "WHOLESALE", name: "Mayoreo", currency: "USD" });
    const updated = await setStatus.execute({ tenantId: "t1", companyId: "c1", id: priceList.id, status: "INACTIVE" });
    expect(updated.status).toBe("INACTIVE");
  });
});
