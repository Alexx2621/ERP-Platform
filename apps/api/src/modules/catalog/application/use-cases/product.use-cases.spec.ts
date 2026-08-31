import { InMemoryProductRepository } from "../../test-support/in-memory-product.repository";
import { InMemoryUnitOfMeasureRepository } from "../../test-support/in-memory-unit-of-measure.repository";
import { InMemoryCategoryRepository } from "../../test-support/in-memory-category.repository";
import { InMemoryBrandRepository } from "../../test-support/in-memory-brand.repository";
import { CreateUnitOfMeasureUseCase } from "./create-unit-of-measure.use-case";
import { CreateProductUseCase } from "./create-product.use-case";
import { UpdateProductUseCase } from "./update-product.use-case";
import { ListProductsUseCase } from "./list-products.use-case";
import { SetProductStatusUseCase } from "./set-product-status.use-case";
import {
  ProductBarcodeAlreadyInUseError,
  ProductCodeAlreadyInUseError,
  ProductNotFoundError,
  ProductUnitOfMeasureNotFoundError,
} from "../errors";

async function buildContext() {
  const products = new InMemoryProductRepository();
  const units = new InMemoryUnitOfMeasureRepository();
  const categories = new InMemoryCategoryRepository();
  const brands = new InMemoryBrandRepository();
  const unit = await new CreateUnitOfMeasureUseCase(units).execute({
    tenantId: "t1",
    companyId: "c1",
    code: "UN",
    name: "Unidad",
    symbol: "u",
  });
  return {
    products,
    units,
    unit,
    createProduct: new CreateProductUseCase(products, units, categories, brands),
    updateProduct: new UpdateProductUseCase(products, categories, brands),
    listProducts: new ListProductsUseCase(products),
    setStatus: new SetProductStatusUseCase(products),
  };
}

describe("Product use cases", () => {
  it("creates a sellable product without variants", async () => {
    const { createProduct, unit } = await buildContext();
    const product = await createProduct.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "SKU-1",
      name: "Camisa",
      unitOfMeasureId: unit.id,
      basePrice: "19.99",
    });
    expect(product.basePrice).toBe("19.99");
  });

  it("rejects an unknown unit of measure", async () => {
    const { createProduct } = await buildContext();
    await expect(
      createProduct.execute({
        tenantId: "t1",
        companyId: "c1",
        code: "SKU-1",
        name: "Camisa",
        unitOfMeasureId: "unknown",
        basePrice: "19.99",
      }),
    ).rejects.toThrow(ProductUnitOfMeasureNotFoundError);
  });

  it("rejects a duplicate code within the same company", async () => {
    const { createProduct, unit } = await buildContext();
    await createProduct.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "SKU-1",
      name: "Camisa",
      unitOfMeasureId: unit.id,
      basePrice: "19.99",
    });
    await expect(
      createProduct.execute({
        tenantId: "t1",
        companyId: "c1",
        code: "SKU-1",
        name: "Otra",
        unitOfMeasureId: unit.id,
        basePrice: "9.99",
      }),
    ).rejects.toThrow(ProductCodeAlreadyInUseError);
  });

  it("rejects a duplicate barcode within the same company", async () => {
    const { createProduct, unit } = await buildContext();
    await createProduct.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "SKU-1",
      name: "Camisa",
      unitOfMeasureId: unit.id,
      basePrice: "19.99",
      barcode: "1234567890",
    });
    await expect(
      createProduct.execute({
        tenantId: "t1",
        companyId: "c1",
        code: "SKU-2",
        name: "Pantalón",
        unitOfMeasureId: unit.id,
        basePrice: "29.99",
        barcode: "1234567890",
      }),
    ).rejects.toThrow(ProductBarcodeAlreadyInUseError);
  });

  it("creates a hasVariants product without a basePrice", async () => {
    const { createProduct, unit } = await buildContext();
    const product = await createProduct.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "SKU-1",
      name: "Camisa",
      unitOfMeasureId: unit.id,
      hasVariants: true,
    });
    expect(product.basePrice).toBeNull();
    expect(product.hasVariants).toBe(true);
  });

  it("updates a product", async () => {
    const { createProduct, updateProduct, unit } = await buildContext();
    const product = await createProduct.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "SKU-1",
      name: "Camisa",
      unitOfMeasureId: unit.id,
      basePrice: "19.99",
    });
    const updated = await updateProduct.execute({
      tenantId: "t1",
      companyId: "c1",
      id: product.id,
      name: "Camisa de algodón",
      basePrice: "24.99",
      trackInventory: true,
      sellable: true,
      purchasable: true,
      publishOnline: true,
    });
    expect(updated.name).toBe("Camisa de algodón");
    expect(updated.basePrice).toBe("24.99");
    expect(updated.publishOnline).toBe(true);
  });

  it("keeps basePrice/baseCost/categoryId/brandId/barcode unchanged when omitted from an update", async () => {
    const { createProduct, updateProduct, unit } = await buildContext();
    const product = await createProduct.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "SKU-1",
      name: "Camisa",
      unitOfMeasureId: unit.id,
      basePrice: "19.99",
      baseCost: "9.99",
      barcode: "1234567890",
    });

    const updated = await updateProduct.execute({
      tenantId: "t1",
      companyId: "c1",
      id: product.id,
      name: "Camisa renombrada",
      trackInventory: true,
      sellable: true,
      purchasable: true,
      publishOnline: false,
    });

    expect(updated.name).toBe("Camisa renombrada");
    expect(updated.basePrice).toBe("19.99");
    expect(updated.baseCost).toBe("9.99");
    expect(updated.barcode).toBe("1234567890");
  });

  it("clears basePrice/baseCost/barcode when explicitly sent as an empty string", async () => {
    const { createProduct, updateProduct, unit } = await buildContext();
    const product = await createProduct.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "SKU-1",
      name: "Camisa",
      unitOfMeasureId: unit.id,
      basePrice: "19.99",
      baseCost: "9.99",
      barcode: "1234567890",
      sellable: false,
    });

    const updated = await updateProduct.execute({
      tenantId: "t1",
      companyId: "c1",
      id: product.id,
      name: "Camisa",
      basePrice: "",
      baseCost: "",
      barcode: "",
      trackInventory: true,
      sellable: false,
      purchasable: true,
      publishOnline: false,
    });

    expect(updated.basePrice).toBeNull();
    expect(updated.baseCost).toBeNull();
    expect(updated.barcode).toBeNull();
  });

  it("rejects updating a product from a different company as not found", async () => {
    const { createProduct, updateProduct, unit } = await buildContext();
    const product = await createProduct.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "SKU-1",
      name: "Camisa",
      unitOfMeasureId: unit.id,
      basePrice: "19.99",
    });
    await expect(
      updateProduct.execute({
        tenantId: "t1",
        companyId: "c2",
        id: product.id,
        name: "X",
        trackInventory: true,
        sellable: true,
        purchasable: true,
        publishOnline: false,
      }),
    ).rejects.toThrow(ProductNotFoundError);
  });

  it("lists products scoped to a company", async () => {
    const { createProduct, listProducts, unit } = await buildContext();
    await createProduct.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "SKU-1",
      name: "Camisa",
      unitOfMeasureId: unit.id,
      basePrice: "19.99",
    });
    expect(await listProducts.execute("t1", "c1")).toHaveLength(1);
    expect(await listProducts.execute("t1", "c2")).toHaveLength(0);
  });

  it("toggles status", async () => {
    const { createProduct, setStatus, unit } = await buildContext();
    const product = await createProduct.execute({
      tenantId: "t1",
      companyId: "c1",
      code: "SKU-1",
      name: "Camisa",
      unitOfMeasureId: unit.id,
      basePrice: "19.99",
    });
    const updated = await setStatus.execute({ tenantId: "t1", companyId: "c1", id: product.id, status: "DISCONTINUED" });
    expect(updated.status).toBe("DISCONTINUED");
  });
});
