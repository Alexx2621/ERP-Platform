import { InMemoryUnitOfMeasureRepository } from "../../catalog/test-support/in-memory-unit-of-measure.repository";
import { InMemoryCategoryRepository } from "../../catalog/test-support/in-memory-category.repository";
import { InMemoryBrandRepository } from "../../catalog/test-support/in-memory-brand.repository";
import { InMemoryProductRepository } from "../../catalog/test-support/in-memory-product.repository";
import { InMemoryProductVariantRepository } from "../../catalog/test-support/in-memory-product-variant.repository";
import { CreateUnitOfMeasureUseCase } from "../../catalog/application/use-cases/create-unit-of-measure.use-case";
import { CreateProductUseCase } from "../../catalog/application/use-cases/create-product.use-case";
import { GetProductUseCase } from "../../catalog/application/use-cases/get-product.use-case";
import { GetProductVariantUseCase } from "../../catalog/application/use-cases/get-product-variant.use-case";
import { InMemoryWarehouseRepository } from "../../warehouses/test-support/in-memory-warehouse.repository";
import { CreateWarehouseUseCase } from "../../warehouses/application/use-cases/create-warehouse.use-case";
import { GetWarehouseUseCase } from "../../warehouses/application/use-cases/get-warehouse.use-case";
import { InMemoryInventoryMovementRepository } from "../../inventory/test-support/in-memory-inventory-movement.repository";
import { InMemoryInventoryBalanceRepository } from "../../inventory/test-support/in-memory-inventory-balance.repository";
import { ResolveWarehouseTargetUseCase } from "../../inventory/application/use-cases/resolve-warehouse-target.use-case";
import { ResolveProductTargetUseCase } from "../../inventory/application/use-cases/resolve-product-target.use-case";
import { RecordIssueUseCase } from "../../inventory/application/use-cases/record-issue.use-case";
import { RecordReturnUseCase } from "../../inventory/application/use-cases/record-return.use-case";
import { RecordReceiptUseCase } from "../../inventory/application/use-cases/record-receipt.use-case";
import { InMemoryBillOfMaterialRepository } from "./in-memory-bill-of-material.repository";
import { InMemoryBillOfMaterialComponentRepository } from "./in-memory-bill-of-material-component.repository";
import { InMemoryProductionOrderRepository } from "./in-memory-production-order.repository";
import { InMemoryProductionOrderMaterialRepository } from "./in-memory-production-order-material.repository";
import { InMemoryProductionOrderMaterialMovementRepository } from "./in-memory-production-order-material-movement.repository";
import { InMemoryProductionOrderOperationRepository } from "./in-memory-production-order-operation.repository";
import { InMemoryProductionOrderFinishedGoodsReceiptRepository } from "./in-memory-production-order-finished-goods-receipt.repository";
import { ResolveManufacturingProductTargetUseCase } from "../application/use-cases/resolve-manufacturing-product-target.use-case";
import { CreateBillOfMaterialUseCase } from "../application/use-cases/create-bill-of-material.use-case";
import { SetBillOfMaterialStatusUseCase } from "../application/use-cases/set-bill-of-material-status.use-case";
import { ListBillsOfMaterialUseCase } from "../application/use-cases/list-bills-of-material.use-case";
import { GetBillOfMaterialUseCase } from "../application/use-cases/get-bill-of-material.use-case";
import { ListBillOfMaterialComponentsUseCase } from "../application/use-cases/list-bill-of-material-components.use-case";
import { CreateProductionOrderUseCase } from "../application/use-cases/create-production-order.use-case";
import { ConfirmProductionOrderUseCase } from "../application/use-cases/confirm-production-order.use-case";
import { CloseProductionOrderUseCase } from "../application/use-cases/close-production-order.use-case";
import { CancelProductionOrderUseCase } from "../application/use-cases/cancel-production-order.use-case";
import { ListProductionOrdersUseCase } from "../application/use-cases/list-production-orders.use-case";
import { GetProductionOrderUseCase } from "../application/use-cases/get-production-order.use-case";
import { ListProductionOrderMaterialsUseCase } from "../application/use-cases/list-production-order-materials.use-case";
import { IssueProductionOrderMaterialUseCase } from "../application/use-cases/issue-production-order-material.use-case";
import { ReturnProductionOrderMaterialUseCase } from "../application/use-cases/return-production-order-material.use-case";
import { RecordFinishedGoodsUseCase } from "../application/use-cases/record-finished-goods.use-case";
import { ListProductionOrderFinishedGoodsReceiptsUseCase } from "../application/use-cases/list-production-order-finished-goods-receipts.use-case";
import { AddProductionOrderOperationUseCase } from "../application/use-cases/add-production-order-operation.use-case";
import { CompleteProductionOrderOperationUseCase } from "../application/use-cases/complete-production-order-operation.use-case";
import { ListProductionOrderOperationsUseCase } from "../application/use-cases/list-production-order-operations.use-case";

export const TENANT_ID = "tenant-1";
export const COMPANY_ID = "company-1";
export const OTHER_COMPANY_ID = "company-2";
export const ACTOR_USER_ID = "user-1";
export const CORRELATION_ID = "correlation-1";

/**
 * Shared fixture builder for Manufacturing application-layer tests,
 * mirroring Purchasing's `buildPurchasingTestContext()`: real use cases
 * wired to real in-memory repositories across every module Manufacturing
 * depends on, never mocks.
 */
export async function buildManufacturingTestContext() {
  // Catalog
  const units = new InMemoryUnitOfMeasureRepository();
  const categories = new InMemoryCategoryRepository();
  const brands = new InMemoryBrandRepository();
  const products = new InMemoryProductRepository();
  const variants = new InMemoryProductVariantRepository();
  const createProduct = new CreateProductUseCase(products, units, categories, brands);
  const getProduct = new GetProductUseCase(products);
  const getProductVariant = new GetProductVariantUseCase(variants);

  const unit = await new CreateUnitOfMeasureUseCase(units).execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "UN",
    name: "Unidad",
    symbol: "u",
  });

  const finishedGood = await createProduct.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "SKU-CHAIR",
    name: "Silla de madera",
    unitOfMeasureId: unit.id,
    sellable: false,
  });

  const componentA = await createProduct.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "SKU-WOOD",
    name: "Tabla de madera",
    unitOfMeasureId: unit.id,
    sellable: false,
  });

  const componentB = await createProduct.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "SKU-SCREWS",
    name: "Tornillos",
    unitOfMeasureId: unit.id,
    sellable: false,
  });

  const untrackedComponent = await createProduct.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "SKU-SERVICE",
    name: "Servicio sin inventario",
    unitOfMeasureId: unit.id,
    trackInventory: false,
    sellable: false,
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
    code: "SKU-CHAIR",
    name: "Producto de otra empresa",
    unitOfMeasureId: otherCompanyUnit.id,
    sellable: false,
  });

  // Warehouses
  const warehouses = new InMemoryWarehouseRepository();
  const createWarehouse = new CreateWarehouseUseCase(warehouses);
  const getWarehouse = new GetWarehouseUseCase(warehouses);
  const warehouse = await createWarehouse.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, code: "WH-1", name: "Bodega 1" });

  // Inventory
  const movements = new InMemoryInventoryMovementRepository();
  const balances = new InMemoryInventoryBalanceRepository(movements);
  const resolveWarehouse = new ResolveWarehouseTargetUseCase(getWarehouse);
  const resolveProduct = new ResolveProductTargetUseCase(getProduct, getProductVariant);
  const recordIssue = new RecordIssueUseCase(balances, resolveWarehouse, resolveProduct);
  const recordReturn = new RecordReturnUseCase(balances, resolveWarehouse, resolveProduct);
  const recordReceipt = new RecordReceiptUseCase(balances, resolveWarehouse, resolveProduct);

  // Manufacturing
  const billsOfMaterial = new InMemoryBillOfMaterialRepository();
  const bomComponents = new InMemoryBillOfMaterialComponentRepository();
  const productionOrders = new InMemoryProductionOrderRepository();
  const productionOrderMaterials = new InMemoryProductionOrderMaterialRepository();
  const productionOrderMaterialMovements = new InMemoryProductionOrderMaterialMovementRepository();
  const productionOrderOperations = new InMemoryProductionOrderOperationRepository();
  const productionOrderFinishedGoodsReceipts = new InMemoryProductionOrderFinishedGoodsReceiptRepository();

  const resolveManufacturingProductTarget = new ResolveManufacturingProductTargetUseCase(getProduct, getProductVariant);

  const createBillOfMaterial = new CreateBillOfMaterialUseCase(
    billsOfMaterial,
    bomComponents,
    getProduct,
    resolveManufacturingProductTarget,
  );
  const setBillOfMaterialStatus = new SetBillOfMaterialStatusUseCase(billsOfMaterial);
  const listBillsOfMaterial = new ListBillsOfMaterialUseCase(billsOfMaterial);
  const getBillOfMaterial = new GetBillOfMaterialUseCase(billsOfMaterial);
  const listBillOfMaterialComponents = new ListBillOfMaterialComponentsUseCase(billsOfMaterial, bomComponents);

  const createProductionOrder = new CreateProductionOrderUseCase(
    billsOfMaterial,
    bomComponents,
    productionOrders,
    productionOrderMaterials,
    getWarehouse,
  );
  const confirmProductionOrder = new ConfirmProductionOrderUseCase(productionOrders);
  const closeProductionOrder = new CloseProductionOrderUseCase(productionOrders);
  const cancelProductionOrder = new CancelProductionOrderUseCase(
    productionOrders,
    productionOrderMaterials,
    productionOrderMaterialMovements,
    productionOrderFinishedGoodsReceipts,
  );
  const listProductionOrders = new ListProductionOrdersUseCase(productionOrders);
  const getProductionOrder = new GetProductionOrderUseCase(productionOrders, productionOrderFinishedGoodsReceipts);
  const listProductionOrderMaterials = new ListProductionOrderMaterialsUseCase(
    productionOrders,
    productionOrderMaterials,
    productionOrderMaterialMovements,
  );
  const issueProductionOrderMaterial = new IssueProductionOrderMaterialUseCase(
    productionOrders,
    productionOrderMaterials,
    productionOrderMaterialMovements,
    recordIssue,
  );
  const returnProductionOrderMaterial = new ReturnProductionOrderMaterialUseCase(
    productionOrders,
    productionOrderMaterials,
    productionOrderMaterialMovements,
    recordReturn,
  );
  const recordFinishedGoods = new RecordFinishedGoodsUseCase(productionOrders, productionOrderFinishedGoodsReceipts, recordReceipt);
  const listProductionOrderFinishedGoodsReceipts = new ListProductionOrderFinishedGoodsReceiptsUseCase(
    productionOrders,
    productionOrderFinishedGoodsReceipts,
  );
  const addProductionOrderOperation = new AddProductionOrderOperationUseCase(productionOrders, productionOrderOperations);
  const completeProductionOrderOperation = new CompleteProductionOrderOperationUseCase(
    productionOrders,
    productionOrderOperations,
  );
  const listProductionOrderOperations = new ListProductionOrderOperationsUseCase(productionOrders, productionOrderOperations);

  return {
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    otherCompanyId: OTHER_COMPANY_ID,
    actorUserId: ACTOR_USER_ID,
    correlationId: CORRELATION_ID,
    finishedGood,
    componentA,
    componentB,
    untrackedComponent,
    otherCompanyProduct,
    warehouse,
    balances,
    recordReceipt,
    createBillOfMaterial,
    setBillOfMaterialStatus,
    listBillsOfMaterial,
    getBillOfMaterial,
    listBillOfMaterialComponents,
    createProductionOrder,
    confirmProductionOrder,
    closeProductionOrder,
    cancelProductionOrder,
    listProductionOrders,
    getProductionOrder,
    listProductionOrderMaterials,
    issueProductionOrderMaterial,
    returnProductionOrderMaterial,
    recordFinishedGoods,
    listProductionOrderFinishedGoodsReceipts,
    addProductionOrderOperation,
    completeProductionOrderOperation,
    listProductionOrderOperations,
  };
}

export type ManufacturingTestContext = Awaited<ReturnType<typeof buildManufacturingTestContext>>;
