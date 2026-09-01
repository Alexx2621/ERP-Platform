import { InMemoryUnitOfMeasureRepository } from "../../catalog/test-support/in-memory-unit-of-measure.repository";
import { InMemoryCategoryRepository } from "../../catalog/test-support/in-memory-category.repository";
import { InMemoryBrandRepository } from "../../catalog/test-support/in-memory-brand.repository";
import { InMemoryProductRepository } from "../../catalog/test-support/in-memory-product.repository";
import { InMemoryProductVariantRepository } from "../../catalog/test-support/in-memory-product-variant.repository";
import { CreateUnitOfMeasureUseCase } from "../../catalog/application/use-cases/create-unit-of-measure.use-case";
import { CreateProductUseCase } from "../../catalog/application/use-cases/create-product.use-case";
import { AddProductVariantUseCase } from "../../catalog/application/use-cases/add-product-variant.use-case";
import { GetProductUseCase } from "../../catalog/application/use-cases/get-product.use-case";
import { GetProductVariantUseCase } from "../../catalog/application/use-cases/get-product-variant.use-case";
import { InMemoryWarehouseRepository } from "../../warehouses/test-support/in-memory-warehouse.repository";
import { CreateWarehouseUseCase } from "../../warehouses/application/use-cases/create-warehouse.use-case";
import { GetWarehouseUseCase } from "../../warehouses/application/use-cases/get-warehouse.use-case";
import { InMemorySupplierRepository } from "../../suppliers/test-support/in-memory-supplier.repository";
import { CreateSupplierUseCase } from "../../suppliers/application/use-cases/create-supplier.use-case";
import { GetSupplierUseCase } from "../../suppliers/application/use-cases/get-supplier.use-case";
import { InMemoryInventoryMovementRepository } from "../../inventory/test-support/in-memory-inventory-movement.repository";
import { InMemoryInventoryBalanceRepository } from "../../inventory/test-support/in-memory-inventory-balance.repository";
import { ResolveWarehouseTargetUseCase } from "../../inventory/application/use-cases/resolve-warehouse-target.use-case";
import { ResolveProductTargetUseCase } from "../../inventory/application/use-cases/resolve-product-target.use-case";
import { RecordIssueUseCase } from "../../inventory/application/use-cases/record-issue.use-case";
import { RecordReceiptUseCase } from "../../inventory/application/use-cases/record-receipt.use-case";
import { InMemoryPurchaseOrderRepository } from "./in-memory-purchase-order.repository";
import { InMemoryPurchaseOrderLineRepository } from "./in-memory-purchase-order-line.repository";
import { InMemoryPurchaseReceiptRepository } from "./in-memory-purchase-receipt.repository";
import { InMemoryPurchaseReceiptLineRepository } from "./in-memory-purchase-receipt-line.repository";
import { InMemoryPurchaseReturnRepository } from "./in-memory-purchase-return.repository";
import { InMemoryPurchaseReturnLineRepository } from "./in-memory-purchase-return-line.repository";
import { InMemorySupplierInvoiceRepository } from "./in-memory-supplier-invoice.repository";
import { ResolveSupplierTargetUseCase } from "../application/use-cases/resolve-supplier-target.use-case";
import { ResolvePurchaseLineTargetUseCase } from "../application/use-cases/resolve-purchase-line-target.use-case";
import { CreatePurchaseOrderUseCase } from "../application/use-cases/create-purchase-order.use-case";
import { AddPurchaseOrderLineUseCase } from "../application/use-cases/add-purchase-order-line.use-case";
import { ConfirmPurchaseOrderUseCase } from "../application/use-cases/confirm-purchase-order.use-case";
import { ClosePurchaseOrderUseCase } from "../application/use-cases/close-purchase-order.use-case";
import { CancelPurchaseOrderUseCase } from "../application/use-cases/cancel-purchase-order.use-case";
import { CreatePurchaseReceiptUseCase } from "../application/use-cases/create-purchase-receipt.use-case";
import { CreatePurchaseReturnUseCase } from "../application/use-cases/create-purchase-return.use-case";
import { CreateSupplierInvoiceUseCase } from "../application/use-cases/create-supplier-invoice.use-case";
import { CancelSupplierInvoiceUseCase } from "../application/use-cases/cancel-supplier-invoice.use-case";
import { ListPurchaseOrdersUseCase } from "../application/use-cases/list-purchase-orders.use-case";
import { ListPurchaseOrderLinesUseCase } from "../application/use-cases/list-purchase-order-lines.use-case";
import { ListPurchaseReceiptsUseCase } from "../application/use-cases/list-purchase-receipts.use-case";
import { ListPurchaseReceiptLinesUseCase } from "../application/use-cases/list-purchase-receipt-lines.use-case";
import { ListPurchaseReturnsUseCase } from "../application/use-cases/list-purchase-returns.use-case";
import { ListPurchaseReturnLinesUseCase } from "../application/use-cases/list-purchase-return-lines.use-case";
import { ListSupplierInvoicesUseCase } from "../application/use-cases/list-supplier-invoices.use-case";
import { GetPurchaseOrderUseCase } from "../application/use-cases/get-purchase-order.use-case";

export const TENANT_ID = "tenant-1";
export const COMPANY_ID = "company-1";
export const OTHER_COMPANY_ID = "company-2";
export const ACTOR_USER_ID = "user-1";
export const CORRELATION_ID = "correlation-1";

/**
 * Shared fixture builder for Purchasing application-layer tests, mirroring
 * Sales' `buildSalesTestContext()`: real use cases wired to real in-memory
 * repositories across every module Purchasing depends on, never mocks.
 */
export async function buildPurchasingTestContext() {
  // Catalog
  const units = new InMemoryUnitOfMeasureRepository();
  const categories = new InMemoryCategoryRepository();
  const brands = new InMemoryBrandRepository();
  const products = new InMemoryProductRepository();
  const variants = new InMemoryProductVariantRepository();
  const createProduct = new CreateProductUseCase(products, units, categories, brands);
  const addVariant = new AddProductVariantUseCase(variants, products);
  const getProduct = new GetProductUseCase(products);
  const getProductVariant = new GetProductVariantUseCase(variants);

  const unit = await new CreateUnitOfMeasureUseCase(units).execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "UN",
    name: "Unidad",
    symbol: "u",
  });

  const trackedProduct = await createProduct.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "SKU-TRACKED",
    name: "Producto rastreado",
    unitOfMeasureId: unit.id,
    baseCost: "4.0000",
    sellable: false,
  });

  const untrackedProduct = await createProduct.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "SKU-SERVICE",
    name: "Servicio sin inventario",
    unitOfMeasureId: unit.id,
    baseCost: "20.0000",
    trackInventory: false,
    sellable: false,
  });

  const variantProduct = await createProduct.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "SKU-VARIANT",
    name: "Camisa",
    unitOfMeasureId: unit.id,
    hasVariants: true,
    sellable: false,
  });
  const variant = await addVariant.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    productId: variantProduct.id,
    sku: "SHIRT-BLUE-M",
    attributes: { color: "Azul", talla: "M" },
    price: "15.0000",
    cost: "6.0000",
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
    baseCost: "4.0000",
    sellable: false,
  });

  // Warehouses
  const warehouses = new InMemoryWarehouseRepository();
  const createWarehouse = new CreateWarehouseUseCase(warehouses);
  const getWarehouse = new GetWarehouseUseCase(warehouses);
  const warehouse = await createWarehouse.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, code: "WH-1", name: "Bodega 1" });

  // Suppliers
  const suppliers = new InMemorySupplierRepository();
  const createSupplier = new CreateSupplierUseCase(suppliers);
  const getSupplier = new GetSupplierUseCase(suppliers);
  const supplier = await createSupplier.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, code: "SUP-1", name: "Proveedor 1" });
  const secondSupplier = await createSupplier.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, code: "SUP-2", name: "Proveedor 2" });
  const otherCompanySupplier = await createSupplier.execute({
    tenantId: TENANT_ID,
    companyId: OTHER_COMPANY_ID,
    code: "SUP-1",
    name: "Proveedor de otra empresa",
  });

  // Inventory
  const movements = new InMemoryInventoryMovementRepository();
  const balances = new InMemoryInventoryBalanceRepository(movements);
  const resolveWarehouse = new ResolveWarehouseTargetUseCase(getWarehouse);
  const resolveProduct = new ResolveProductTargetUseCase(getProduct, getProductVariant);
  const recordIssue = new RecordIssueUseCase(balances, resolveWarehouse, resolveProduct);
  const recordReceipt = new RecordReceiptUseCase(balances, resolveWarehouse, resolveProduct);

  // Purchasing
  const purchaseOrders = new InMemoryPurchaseOrderRepository();
  const purchaseOrderLines = new InMemoryPurchaseOrderLineRepository();
  const purchaseReceipts = new InMemoryPurchaseReceiptRepository();
  const purchaseReceiptLines = new InMemoryPurchaseReceiptLineRepository();
  const purchaseReturns = new InMemoryPurchaseReturnRepository();
  const purchaseReturnLines = new InMemoryPurchaseReturnLineRepository();
  const supplierInvoices = new InMemorySupplierInvoiceRepository();

  const resolveSupplierTarget = new ResolveSupplierTargetUseCase(getSupplier);
  const resolvePurchaseLineTarget = new ResolvePurchaseLineTargetUseCase(getProduct, getProductVariant, getWarehouse);

  const createPurchaseOrder = new CreatePurchaseOrderUseCase(purchaseOrders, resolveSupplierTarget);
  const addPurchaseOrderLine = new AddPurchaseOrderLineUseCase(purchaseOrders, purchaseOrderLines, resolvePurchaseLineTarget);
  const confirmPurchaseOrder = new ConfirmPurchaseOrderUseCase(purchaseOrders, purchaseOrderLines);
  const closePurchaseOrder = new ClosePurchaseOrderUseCase(purchaseOrders);
  const cancelPurchaseOrder = new CancelPurchaseOrderUseCase(purchaseOrders, purchaseReceipts);
  const createPurchaseReceipt = new CreatePurchaseReceiptUseCase(
    purchaseOrders,
    purchaseOrderLines,
    purchaseReceipts,
    purchaseReceiptLines,
    recordReceipt,
  );
  const createPurchaseReturn = new CreatePurchaseReturnUseCase(
    purchaseOrders,
    purchaseOrderLines,
    purchaseReceiptLines,
    purchaseReturns,
    purchaseReturnLines,
    recordIssue,
  );
  const createSupplierInvoice = new CreateSupplierInvoiceUseCase(supplierInvoices, purchaseOrders, resolveSupplierTarget);
  const cancelSupplierInvoice = new CancelSupplierInvoiceUseCase(supplierInvoices);

  const listPurchaseOrders = new ListPurchaseOrdersUseCase(purchaseOrders);
  const listPurchaseOrderLines = new ListPurchaseOrderLinesUseCase(purchaseOrders, purchaseOrderLines);
  const listPurchaseReceipts = new ListPurchaseReceiptsUseCase(purchaseReceipts);
  const listPurchaseReceiptLines = new ListPurchaseReceiptLinesUseCase(purchaseReceipts, purchaseReceiptLines);
  const listPurchaseReturns = new ListPurchaseReturnsUseCase(purchaseReturns);
  const listPurchaseReturnLines = new ListPurchaseReturnLinesUseCase(purchaseReturns, purchaseReturnLines);
  const listSupplierInvoices = new ListSupplierInvoicesUseCase(supplierInvoices);
  const getPurchaseOrder = new GetPurchaseOrderUseCase(purchaseOrders);

  return {
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    otherCompanyId: OTHER_COMPANY_ID,
    actorUserId: ACTOR_USER_ID,
    correlationId: CORRELATION_ID,
    trackedProduct,
    untrackedProduct,
    variantProduct,
    variant,
    otherCompanyProduct,
    warehouse,
    supplier,
    secondSupplier,
    otherCompanySupplier,
    balances,
    resolveSupplierTarget,
    resolvePurchaseLineTarget,
    createPurchaseOrder,
    addPurchaseOrderLine,
    confirmPurchaseOrder,
    closePurchaseOrder,
    cancelPurchaseOrder,
    createPurchaseReceipt,
    createPurchaseReturn,
    createSupplierInvoice,
    cancelSupplierInvoice,
    listPurchaseOrders,
    listPurchaseOrderLines,
    listPurchaseReceipts,
    listPurchaseReceiptLines,
    listPurchaseReturns,
    listPurchaseReturnLines,
    listSupplierInvoices,
    getPurchaseOrder,
  };
}

export type PurchasingTestContext = Awaited<ReturnType<typeof buildPurchasingTestContext>>;
