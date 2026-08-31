import { InMemoryProductRepository } from "../../../catalog/test-support/in-memory-product.repository";
import { InMemoryUnitOfMeasureRepository } from "../../../catalog/test-support/in-memory-unit-of-measure.repository";
import { InMemoryCategoryRepository } from "../../../catalog/test-support/in-memory-category.repository";
import { InMemoryBrandRepository } from "../../../catalog/test-support/in-memory-brand.repository";
import { CreateUnitOfMeasureUseCase } from "../../../catalog/application/use-cases/create-unit-of-measure.use-case";
import { CreateProductUseCase } from "../../../catalog/application/use-cases/create-product.use-case";
import { GetProductUseCase } from "../../../catalog/application/use-cases/get-product.use-case";
import { InMemoryPriceListRepository } from "../../test-support/in-memory-price-list.repository";
import { InMemoryPriceListItemRepository } from "../../test-support/in-memory-price-list-item.repository";
import { CreatePriceListUseCase } from "./create-price-list.use-case";
import { AddPriceListItemUseCase } from "./add-price-list-item.use-case";
import { UpdatePriceListItemUseCase } from "./update-price-list-item.use-case";
import { RemovePriceListItemUseCase } from "./remove-price-list-item.use-case";
import { ListPriceListItemsUseCase } from "./list-price-list-items.use-case";
import {
  PriceListItemAlreadyExistsError,
  PriceListItemNotFoundError,
  PriceListItemProductHasVariantsError,
  PriceListItemProductNotFoundError,
  PriceListNotFoundError,
} from "../errors";

async function buildContext() {
  const products = new InMemoryProductRepository();
  const units = new InMemoryUnitOfMeasureRepository();
  const categories = new InMemoryCategoryRepository();
  const brands = new InMemoryBrandRepository();
  const priceLists = new InMemoryPriceListRepository();
  const items = new InMemoryPriceListItemRepository();

  const unit = await new CreateUnitOfMeasureUseCase(units).execute({
    tenantId: "t1",
    companyId: "c1",
    code: "UN",
    name: "Unidad",
    symbol: "u",
  });
  const createProduct = new CreateProductUseCase(products, units, categories, brands);
  const getProduct = new GetProductUseCase(products);

  const product = await createProduct.execute({
    tenantId: "t1",
    companyId: "c1",
    code: "SKU-1",
    name: "Camisa",
    unitOfMeasureId: unit.id,
    basePrice: "19.99",
  });
  const variantProduct = await createProduct.execute({
    tenantId: "t1",
    companyId: "c1",
    code: "SKU-2",
    name: "Pantalón",
    unitOfMeasureId: unit.id,
    hasVariants: true,
  });
  const otherCompanyProduct = await createProduct.execute({
    tenantId: "t1",
    companyId: "c2",
    code: "SKU-1",
    name: "Camisa (otra empresa)",
    unitOfMeasureId: (
      await new CreateUnitOfMeasureUseCase(units).execute({ tenantId: "t1", companyId: "c2", code: "UN", name: "Unidad", symbol: "u" })
    ).id,
    basePrice: "9.99",
  });

  const createPriceList = new CreatePriceListUseCase(priceLists);
  const priceList = await createPriceList.execute({ tenantId: "t1", companyId: "c1", code: "WHOLESALE", name: "Mayoreo", currency: "USD" });

  return {
    product,
    variantProduct,
    otherCompanyProduct,
    priceList,
    addItem: new AddPriceListItemUseCase(priceLists, items, getProduct),
    updateItem: new UpdatePriceListItemUseCase(priceLists, items),
    removeItem: new RemovePriceListItemUseCase(priceLists, items),
    listItems: new ListPriceListItemsUseCase(priceLists, items),
  };
}

describe("PriceListItem use cases", () => {
  it("adds an item for a real, company-scoped, non-variant product", async () => {
    const { addItem, priceList, product } = await buildContext();
    const item = await addItem.execute({
      tenantId: "t1",
      companyId: "c1",
      priceListId: priceList.id,
      productId: product.id,
      price: "24.9900",
    });
    expect(item.price).toBe("24.9900");
    expect(item.productId).toBe(product.id);
  });

  it("rejects a product that does not exist", async () => {
    const { addItem, priceList } = await buildContext();
    await expect(
      addItem.execute({ tenantId: "t1", companyId: "c1", priceListId: priceList.id, productId: "missing", price: "1.0000" }),
    ).rejects.toThrow(PriceListItemProductNotFoundError);
  });

  it("rejects a product belonging to a different company", async () => {
    const { addItem, priceList, otherCompanyProduct } = await buildContext();
    await expect(
      addItem.execute({
        tenantId: "t1",
        companyId: "c1",
        priceListId: priceList.id,
        productId: otherCompanyProduct.id,
        price: "1.0000",
      }),
    ).rejects.toThrow(PriceListItemProductNotFoundError);
  });

  it("rejects a hasVariants product", async () => {
    const { addItem, priceList, variantProduct } = await buildContext();
    await expect(
      addItem.execute({ tenantId: "t1", companyId: "c1", priceListId: priceList.id, productId: variantProduct.id, price: "1.0000" }),
    ).rejects.toThrow(PriceListItemProductHasVariantsError);
  });

  it("rejects adding the same product twice to the same price list", async () => {
    const { addItem, priceList, product } = await buildContext();
    await addItem.execute({ tenantId: "t1", companyId: "c1", priceListId: priceList.id, productId: product.id, price: "24.9900" });
    await expect(
      addItem.execute({ tenantId: "t1", companyId: "c1", priceListId: priceList.id, productId: product.id, price: "29.9900" }),
    ).rejects.toThrow(PriceListItemAlreadyExistsError);
  });

  it("rejects operating on a price list from a different company", async () => {
    const { addItem, priceList, product } = await buildContext();
    await expect(
      addItem.execute({ tenantId: "t1", companyId: "c2", priceListId: priceList.id, productId: product.id, price: "1.0000" }),
    ).rejects.toThrow(PriceListNotFoundError);
  });

  it("updates an item's price", async () => {
    const { addItem, updateItem, priceList, product } = await buildContext();
    const item = await addItem.execute({ tenantId: "t1", companyId: "c1", priceListId: priceList.id, productId: product.id, price: "24.9900" });
    const updated = await updateItem.execute({ tenantId: "t1", companyId: "c1", priceListId: priceList.id, itemId: item.id, price: "22.5000" });
    expect(updated.price).toBe("22.5000");
  });

  it("rejects updating an item that does not belong to the given price list", async () => {
    const { addItem, updateItem, priceList, product } = await buildContext();
    const item = await addItem.execute({ tenantId: "t1", companyId: "c1", priceListId: priceList.id, productId: product.id, price: "24.9900" });
    await expect(
      updateItem.execute({ tenantId: "t1", companyId: "c1", priceListId: "other-list", itemId: item.id, price: "1.0000" }),
    ).rejects.toThrow();
  });

  it("removes an item (hard delete)", async () => {
    const { addItem, removeItem, listItems, priceList, product } = await buildContext();
    const item = await addItem.execute({ tenantId: "t1", companyId: "c1", priceListId: priceList.id, productId: product.id, price: "24.9900" });
    await removeItem.execute({ tenantId: "t1", companyId: "c1", priceListId: priceList.id, itemId: item.id });
    expect(await listItems.execute({ tenantId: "t1", companyId: "c1", priceListId: priceList.id })).toHaveLength(0);
  });

  it("rejects removing an item that was already removed", async () => {
    const { addItem, removeItem, priceList, product } = await buildContext();
    const item = await addItem.execute({ tenantId: "t1", companyId: "c1", priceListId: priceList.id, productId: product.id, price: "24.9900" });
    await removeItem.execute({ tenantId: "t1", companyId: "c1", priceListId: priceList.id, itemId: item.id });
    await expect(
      removeItem.execute({ tenantId: "t1", companyId: "c1", priceListId: priceList.id, itemId: item.id }),
    ).rejects.toThrow(PriceListItemNotFoundError);
  });

  it("lists items scoped to a price list", async () => {
    const { addItem, listItems, priceList, product } = await buildContext();
    await addItem.execute({ tenantId: "t1", companyId: "c1", priceListId: priceList.id, productId: product.id, price: "24.9900" });
    expect(await listItems.execute({ tenantId: "t1", companyId: "c1", priceListId: priceList.id })).toHaveLength(1);
  });
});
