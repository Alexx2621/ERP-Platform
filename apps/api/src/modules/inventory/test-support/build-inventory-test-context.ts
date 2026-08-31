import { InMemoryProductRepository } from "../../catalog/test-support/in-memory-product.repository";
import { InMemoryProductVariantRepository } from "../../catalog/test-support/in-memory-product-variant.repository";
import { InMemoryUnitOfMeasureRepository } from "../../catalog/test-support/in-memory-unit-of-measure.repository";
import { InMemoryCategoryRepository } from "../../catalog/test-support/in-memory-category.repository";
import { InMemoryBrandRepository } from "../../catalog/test-support/in-memory-brand.repository";
import { CreateUnitOfMeasureUseCase } from "../../catalog/application/use-cases/create-unit-of-measure.use-case";
import { CreateProductUseCase } from "../../catalog/application/use-cases/create-product.use-case";
import { AddProductVariantUseCase } from "../../catalog/application/use-cases/add-product-variant.use-case";
import { GetProductUseCase } from "../../catalog/application/use-cases/get-product.use-case";
import { GetProductVariantUseCase } from "../../catalog/application/use-cases/get-product-variant.use-case";
import { InMemoryWarehouseRepository } from "../../warehouses/test-support/in-memory-warehouse.repository";
import { CreateWarehouseUseCase } from "../../warehouses/application/use-cases/create-warehouse.use-case";
import { GetWarehouseUseCase } from "../../warehouses/application/use-cases/get-warehouse.use-case";
import { ResolveWarehouseTargetUseCase } from "../application/use-cases/resolve-warehouse-target.use-case";
import { ResolveProductTargetUseCase } from "../application/use-cases/resolve-product-target.use-case";
import { InMemoryInventoryMovementRepository } from "./in-memory-inventory-movement.repository";
import { InMemoryInventoryBalanceRepository } from "./in-memory-inventory-balance.repository";
import { InMemoryInventoryTransferRepository } from "./in-memory-inventory-transfer.repository";
import { InMemoryInventoryReservationRepository } from "./in-memory-inventory-reservation.repository";

export const TENANT_ID = "tenant-1";
export const COMPANY_ID = "company-1";
export const OTHER_COMPANY_ID = "company-2";

/**
 * Shared fixture builder for Inventory application-layer tests, mirroring
 * `PriceListItem use cases`' own `buildContext()` pattern: real Catalog/
 * Warehouses use cases wired to real in-memory repositories, not mocks —
 * so a test exercises the actual cross-module contract
 * (`GetProductUseCase`/`GetProductVariantUseCase`/`GetWarehouseUseCase`),
 * not a stand-in for it.
 */
export async function buildInventoryTestContext() {
  const units = new InMemoryUnitOfMeasureRepository();
  const categories = new InMemoryCategoryRepository();
  const brands = new InMemoryBrandRepository();
  const products = new InMemoryProductRepository();
  const variants = new InMemoryProductVariantRepository();
  const warehouses = new InMemoryWarehouseRepository();

  const movements = new InMemoryInventoryMovementRepository();
  const balances = new InMemoryInventoryBalanceRepository(movements);
  const transfers = new InMemoryInventoryTransferRepository();
  const reservations = new InMemoryInventoryReservationRepository();

  const unit = await new CreateUnitOfMeasureUseCase(units).execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "UN",
    name: "Unidad",
    symbol: "u",
  });

  const createProduct = new CreateProductUseCase(products, units, categories, brands);
  const getProduct = new GetProductUseCase(products);
  const getProductVariant = new GetProductVariantUseCase(variants);
  const addVariant = new AddProductVariantUseCase(variants, products);

  const trackedProduct = await createProduct.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "SKU-TRACKED",
    name: "Producto rastreado",
    unitOfMeasureId: unit.id,
    basePrice: "10.0000",
  });

  const untrackedProduct = await createProduct.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "SKU-UNTRACKED",
    name: "Servicio sin inventario",
    unitOfMeasureId: unit.id,
    basePrice: "5.0000",
    trackInventory: false,
  });

  const variantProduct = await createProduct.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "SKU-VARIANT",
    name: "Camisa",
    unitOfMeasureId: unit.id,
    hasVariants: true,
  });
  const variant = await addVariant.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    productId: variantProduct.id,
    sku: "SHIRT-BLUE-M",
    attributes: { color: "Azul", talla: "M" },
    price: "15.0000",
  });

  const otherCompanyUnit = await new CreateUnitOfMeasureUseCase(units).execute({
    tenantId: TENANT_ID,
    companyId: OTHER_COMPANY_ID,
    code: "UN",
    name: "Unidad",
    symbol: "u",
  });
  const otherCompanyProduct = await createProduct.execute({
    tenantId: TENANT_ID,
    companyId: OTHER_COMPANY_ID,
    code: "SKU-TRACKED",
    name: "Producto de otra empresa",
    unitOfMeasureId: otherCompanyUnit.id,
    basePrice: "10.0000",
  });

  const createWarehouse = new CreateWarehouseUseCase(warehouses);
  const getWarehouse = new GetWarehouseUseCase(warehouses);
  const warehouse1 = await createWarehouse.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, code: "WH-1", name: "Bodega 1" });
  const warehouse2 = await createWarehouse.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, code: "WH-2", name: "Bodega 2" });
  const otherCompanyWarehouse = await createWarehouse.execute({
    tenantId: TENANT_ID,
    companyId: OTHER_COMPANY_ID,
    code: "WH-1",
    name: "Bodega de otra empresa",
  });

  const resolveWarehouse = new ResolveWarehouseTargetUseCase(getWarehouse);
  const resolveProduct = new ResolveProductTargetUseCase(getProduct, getProductVariant);

  return {
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    otherCompanyId: OTHER_COMPANY_ID,
    trackedProduct,
    untrackedProduct,
    variantProduct,
    variant,
    otherCompanyProduct,
    warehouse1,
    warehouse2,
    otherCompanyWarehouse,
    movements,
    balances,
    transfers,
    reservations,
    resolveWarehouse,
    resolveProduct,
  };
}

export type InventoryTestContext = Awaited<ReturnType<typeof buildInventoryTestContext>>;
