import { InMemoryProductRepository } from "../../test-support/in-memory-product.repository";
import { InMemoryProductVariantRepository } from "../../test-support/in-memory-product-variant.repository";
import { InMemoryUnitOfMeasureRepository } from "../../test-support/in-memory-unit-of-measure.repository";
import { InMemoryCategoryRepository } from "../../test-support/in-memory-category.repository";
import { InMemoryBrandRepository } from "../../test-support/in-memory-brand.repository";
import { CreateUnitOfMeasureUseCase } from "./create-unit-of-measure.use-case";
import { CreateProductUseCase } from "./create-product.use-case";
import { AddProductVariantUseCase } from "./add-product-variant.use-case";
import { UpdateProductVariantUseCase } from "./update-product-variant.use-case";
import { ListProductVariantsUseCase } from "./list-product-variants.use-case";
import { SetProductVariantStatusUseCase } from "./set-product-variant-status.use-case";
import {
  ProductDoesNotSupportVariantsError,
  ProductNotFoundError,
  ProductVariantNotFoundError,
  ProductVariantSkuAlreadyInUseError,
} from "../errors";

async function buildContext() {
  const products = new InMemoryProductRepository();
  const variants = new InMemoryProductVariantRepository();
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
  const createProduct = new CreateProductUseCase(products, units, categories, brands);
  const withVariants = await createProduct.execute({
    tenantId: "t1",
    companyId: "c1",
    code: "SHIRT",
    name: "Camisa",
    unitOfMeasureId: unit.id,
    hasVariants: true,
  });
  const withoutVariants = await createProduct.execute({
    tenantId: "t1",
    companyId: "c1",
    code: "PANTS",
    name: "Pantalón",
    unitOfMeasureId: unit.id,
    basePrice: "29.99",
  });
  return {
    products,
    variants,
    withVariants,
    withoutVariants,
    addVariant: new AddProductVariantUseCase(variants, products),
    updateVariant: new UpdateProductVariantUseCase(variants, products),
    listVariants: new ListProductVariantsUseCase(variants, products),
    setStatus: new SetProductVariantStatusUseCase(variants, products),
  };
}

describe("Product variant use cases", () => {
  it("adds a variant to a hasVariants product", async () => {
    const { addVariant, withVariants } = await buildContext();
    const variant = await addVariant.execute({
      tenantId: "t1",
      companyId: "c1",
      productId: withVariants.id,
      sku: "SHIRT-BLU-M",
      attributes: { color: "Azul", size: "M" },
      price: "24.99",
    });
    expect(variant.sku).toBe("SHIRT-BLU-M");
  });

  it("rejects adding a variant to a product without hasVariants", async () => {
    const { addVariant, withoutVariants } = await buildContext();
    await expect(
      addVariant.execute({
        tenantId: "t1",
        companyId: "c1",
        productId: withoutVariants.id,
        sku: "PANTS-BLU-M",
        attributes: { color: "Azul" },
        price: "29.99",
      }),
    ).rejects.toThrow(ProductDoesNotSupportVariantsError);
  });

  it("rejects an unknown product", async () => {
    const { addVariant } = await buildContext();
    await expect(
      addVariant.execute({
        tenantId: "t1",
        companyId: "c1",
        productId: "unknown",
        sku: "X",
        attributes: { color: "Azul" },
        price: "1.00",
      }),
    ).rejects.toThrow(ProductNotFoundError);
  });

  it("rejects a duplicate SKU", async () => {
    const { addVariant, withVariants } = await buildContext();
    await addVariant.execute({
      tenantId: "t1",
      companyId: "c1",
      productId: withVariants.id,
      sku: "SHIRT-BLU-M",
      attributes: { color: "Azul", size: "M" },
      price: "24.99",
    });
    await expect(
      addVariant.execute({
        tenantId: "t1",
        companyId: "c1",
        productId: withVariants.id,
        sku: "SHIRT-BLU-M",
        attributes: { color: "Azul", size: "L" },
        price: "24.99",
      }),
    ).rejects.toThrow(ProductVariantSkuAlreadyInUseError);
  });

  it("reprices a variant", async () => {
    const { addVariant, updateVariant, withVariants } = await buildContext();
    const variant = await addVariant.execute({
      tenantId: "t1",
      companyId: "c1",
      productId: withVariants.id,
      sku: "SHIRT-BLU-M",
      attributes: { color: "Azul", size: "M" },
      price: "24.99",
    });
    const updated = await updateVariant.execute({
      tenantId: "t1",
      companyId: "c1",
      productId: withVariants.id,
      variantId: variant.id,
      price: "27.99",
    });
    expect(updated.price).toBe("27.99");
  });

  it("keeps cost unchanged when omitted, and clears it when sent as an empty string", async () => {
    const { addVariant, updateVariant, withVariants } = await buildContext();
    const variant = await addVariant.execute({
      tenantId: "t1",
      companyId: "c1",
      productId: withVariants.id,
      sku: "SHIRT-BLU-M",
      attributes: { color: "Azul", size: "M" },
      price: "24.99",
      cost: "12.00",
    });

    const repriced = await updateVariant.execute({
      tenantId: "t1",
      companyId: "c1",
      productId: withVariants.id,
      variantId: variant.id,
      price: "27.99",
    });
    expect(repriced.cost).toBe("12.00");

    const cleared = await updateVariant.execute({
      tenantId: "t1",
      companyId: "c1",
      productId: withVariants.id,
      variantId: variant.id,
      price: "27.99",
      cost: "",
    });
    expect(cleared.cost).toBeNull();
  });

  it("rejects updating a variant that does not belong to the product", async () => {
    const { addVariant, updateVariant, withVariants, withoutVariants } = await buildContext();
    const variant = await addVariant.execute({
      tenantId: "t1",
      companyId: "c1",
      productId: withVariants.id,
      sku: "SHIRT-BLU-M",
      attributes: { color: "Azul", size: "M" },
      price: "24.99",
    });
    await expect(
      updateVariant.execute({
        tenantId: "t1",
        companyId: "c1",
        productId: withoutVariants.id,
        variantId: variant.id,
        price: "1.00",
      }),
    ).rejects.toThrow(ProductVariantNotFoundError);
  });

  it("lists variants for a product", async () => {
    const { addVariant, listVariants, withVariants } = await buildContext();
    await addVariant.execute({
      tenantId: "t1",
      companyId: "c1",
      productId: withVariants.id,
      sku: "SHIRT-BLU-M",
      attributes: { color: "Azul", size: "M" },
      price: "24.99",
    });
    expect(await listVariants.execute("t1", "c1", withVariants.id)).toHaveLength(1);
  });

  it("toggles variant status", async () => {
    const { addVariant, setStatus, withVariants } = await buildContext();
    const variant = await addVariant.execute({
      tenantId: "t1",
      companyId: "c1",
      productId: withVariants.id,
      sku: "SHIRT-BLU-M",
      attributes: { color: "Azul", size: "M" },
      price: "24.99",
    });
    const updated = await setStatus.execute({
      tenantId: "t1",
      companyId: "c1",
      productId: withVariants.id,
      variantId: variant.id,
      status: "INACTIVE",
    });
    expect(updated.status).toBe("INACTIVE");
  });
});
