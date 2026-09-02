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
import { ListProductVariantsUseCase } from "../../catalog/application/use-cases/list-product-variants.use-case";
import { InMemoryWarehouseRepository } from "../../warehouses/test-support/in-memory-warehouse.repository";
import { CreateWarehouseUseCase } from "../../warehouses/application/use-cases/create-warehouse.use-case";
import { GetWarehouseUseCase } from "../../warehouses/application/use-cases/get-warehouse.use-case";
import { InMemoryTaxRepository } from "../../taxes/test-support/in-memory-tax.repository";
import { CreateTaxUseCase } from "../../taxes/application/use-cases/create-tax.use-case";
import { GetTaxUseCase } from "../../taxes/application/use-cases/get-tax.use-case";
import { InMemoryCustomerRepository } from "../../customers/test-support/in-memory-customer.repository";
import { CreateCustomerUseCase } from "../../customers/application/use-cases/create-customer.use-case";
import { GetCustomerUseCase } from "../../customers/application/use-cases/get-customer.use-case";
import { InMemoryPriceListRepository } from "../../pricing/test-support/in-memory-price-list.repository";
import { InMemoryPriceListItemRepository } from "../../pricing/test-support/in-memory-price-list-item.repository";
import { CreatePriceListUseCase } from "../../pricing/application/use-cases/create-price-list.use-case";
import { AddPriceListItemUseCase } from "../../pricing/application/use-cases/add-price-list-item.use-case";
import { GetPriceListItemUseCase } from "../../pricing/application/use-cases/get-price-list-item.use-case";
import { InMemoryInventoryMovementRepository } from "../../inventory/test-support/in-memory-inventory-movement.repository";
import { InMemoryInventoryBalanceRepository } from "../../inventory/test-support/in-memory-inventory-balance.repository";
import { InMemoryInventoryReservationRepository } from "../../inventory/test-support/in-memory-inventory-reservation.repository";
import { ResolveWarehouseTargetUseCase } from "../../inventory/application/use-cases/resolve-warehouse-target.use-case";
import { ResolveProductTargetUseCase } from "../../inventory/application/use-cases/resolve-product-target.use-case";
import { CreateReservationUseCase } from "../../inventory/application/use-cases/create-reservation.use-case";
import { ReleaseReservationUseCase } from "../../inventory/application/use-cases/release-reservation.use-case";
import { RecordIssueUseCase } from "../../inventory/application/use-cases/record-issue.use-case";
import { RecordReturnUseCase } from "../../inventory/application/use-cases/record-return.use-case";
import { RecordReceiptUseCase } from "../../inventory/application/use-cases/record-receipt.use-case";
import { InMemoryQuoteRepository } from "./in-memory-quote.repository";
import { InMemoryQuoteLineRepository } from "./in-memory-quote-line.repository";
import { InMemorySalesOrderRepository } from "./in-memory-sales-order.repository";
import { InMemorySalesOrderLineRepository } from "./in-memory-sales-order-line.repository";
import { InMemorySalesReturnRepository } from "./in-memory-sales-return.repository";
import { InMemorySalesReturnLineRepository } from "./in-memory-sales-return-line.repository";
import { ResolveCustomerTargetUseCase } from "../application/use-cases/resolve-customer-target.use-case";
import { ResolveSalesLineTargetUseCase } from "../application/use-cases/resolve-sales-line-target.use-case";
import { CreateQuoteUseCase } from "../application/use-cases/create-quote.use-case";
import { AddQuoteLineUseCase } from "../application/use-cases/add-quote-line.use-case";
import { ConvertQuoteToSalesOrderUseCase } from "../application/use-cases/convert-quote-to-sales-order.use-case";
import { CancelQuoteUseCase } from "../application/use-cases/cancel-quote.use-case";
import { CreateSalesOrderUseCase } from "../application/use-cases/create-sales-order.use-case";
import { AddSalesOrderLineUseCase } from "../application/use-cases/add-sales-order-line.use-case";
import { ConfirmSalesOrderUseCase } from "../application/use-cases/confirm-sales-order.use-case";
import { CancelSalesOrderUseCase } from "../application/use-cases/cancel-sales-order.use-case";
import { FulfillSalesOrderUseCase } from "../application/use-cases/fulfill-sales-order.use-case";
import { CreateSalesReturnUseCase } from "../application/use-cases/create-sales-return.use-case";
import { ListQuotesUseCase } from "../application/use-cases/list-quotes.use-case";
import { ListQuoteLinesUseCase } from "../application/use-cases/list-quote-lines.use-case";
import { ListSalesOrdersUseCase } from "../application/use-cases/list-sales-orders.use-case";
import { ListSalesOrderLinesUseCase } from "../application/use-cases/list-sales-order-lines.use-case";
import { ListSalesReturnsUseCase } from "../application/use-cases/list-sales-returns.use-case";
import { ListSalesReturnLinesUseCase } from "../application/use-cases/list-sales-return-lines.use-case";
import { GetSalesOrderUseCase } from "../application/use-cases/get-sales-order.use-case";

export const TENANT_ID = "tenant-1";
export const COMPANY_ID = "company-1";
export const OTHER_COMPANY_ID = "company-2";
export const ACTOR_USER_ID = "user-1";
export const CORRELATION_ID = "correlation-1";

/**
 * Shared fixture builder for Sales application-layer tests, mirroring the
 * project's established `buildContext()`/`buildInventoryTestContext()`
 * pattern (Pricing, Inventory): real use cases wired to real in-memory
 * repositories across all six modules Sales depends on, never mocks — a
 * Sales test exercises the actual cross-module contracts, not stand-ins.
 */
export async function buildSalesTestContext() {
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
  const listProductVariants = new ListProductVariantsUseCase(variants, products);

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
    basePrice: "10.0000",
  });

  const untrackedProduct = await createProduct.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "SKU-SERVICE",
    name: "Servicio sin inventario",
    unitOfMeasureId: unit.id,
    basePrice: "50.0000",
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

  // Warehouses
  const warehouses = new InMemoryWarehouseRepository();
  const createWarehouse = new CreateWarehouseUseCase(warehouses);
  const getWarehouse = new GetWarehouseUseCase(warehouses);
  const warehouse = await createWarehouse.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, code: "WH-1", name: "Bodega 1" });

  // Taxes
  const taxes = new InMemoryTaxRepository();
  const createTax = new CreateTaxUseCase(taxes);
  const getTax = new GetTaxUseCase(taxes);
  const tax = await createTax.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, code: "IVA", name: "IVA", rate: "12" });

  // Customers
  const customers = new InMemoryCustomerRepository();
  const createCustomer = new CreateCustomerUseCase(customers);
  const getCustomer = new GetCustomerUseCase(customers);
  const customer = await createCustomer.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, code: "CUST-1", name: "Cliente 1" });
  const otherCompanyCustomer = await createCustomer.execute({
    tenantId: TENANT_ID,
    companyId: OTHER_COMPANY_ID,
    code: "CUST-1",
    name: "Cliente de otra empresa",
  });

  // Pricing
  const priceLists = new InMemoryPriceListRepository();
  const priceListItems = new InMemoryPriceListItemRepository();
  const createPriceList = new CreatePriceListUseCase(priceLists);
  const addPriceListItem = new AddPriceListItemUseCase(priceLists, priceListItems, getProduct);
  const getPriceListItem = new GetPriceListItemUseCase(priceListItems);
  const priceList = await createPriceList.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    code: "WHOLESALE",
    name: "Mayoreo",
    currency: "USD",
  });
  await addPriceListItem.execute({
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    priceListId: priceList.id,
    productId: trackedProduct.id,
    price: "8.0000",
  });

  // Inventory
  const movements = new InMemoryInventoryMovementRepository();
  const balances = new InMemoryInventoryBalanceRepository(movements);
  const reservations = new InMemoryInventoryReservationRepository();
  const resolveWarehouse = new ResolveWarehouseTargetUseCase(getWarehouse);
  const resolveProduct = new ResolveProductTargetUseCase(getProduct, getProductVariant);
  const createReservation = new CreateReservationUseCase(balances, reservations, resolveWarehouse, resolveProduct);
  const releaseReservation = new ReleaseReservationUseCase(reservations, balances);
  const recordIssue = new RecordIssueUseCase(balances, resolveWarehouse, resolveProduct);
  const recordReturn = new RecordReturnUseCase(balances, resolveWarehouse, resolveProduct);
  const recordReceipt = new RecordReceiptUseCase(balances, resolveWarehouse, resolveProduct);

  /** Seeds on-hand stock for the tracked product via a real RECEIPT movement. */
  async function receiveStock(quantity: string): Promise<void> {
    await recordReceipt.execute({
      tenantId: TENANT_ID,
      companyId: COMPANY_ID,
      actorUserId: ACTOR_USER_ID,
      correlationId: CORRELATION_ID,
      warehouseId: warehouse.id,
      productId: trackedProduct.id,
      quantity,
    });
  }

  // Sales
  const quotes = new InMemoryQuoteRepository();
  const quoteLines = new InMemoryQuoteLineRepository();
  const salesOrders = new InMemorySalesOrderRepository();
  const salesOrderLines = new InMemorySalesOrderLineRepository();
  const salesReturns = new InMemorySalesReturnRepository();
  const salesReturnLines = new InMemorySalesReturnLineRepository();

  const resolveCustomerTarget = new ResolveCustomerTargetUseCase(getCustomer);
  const resolveSalesLineTarget = new ResolveSalesLineTargetUseCase(getProduct, getProductVariant, getWarehouse, getTax);

  const createQuote = new CreateQuoteUseCase(quotes, resolveCustomerTarget);
  const addQuoteLine = new AddQuoteLineUseCase(quotes, quoteLines, resolveSalesLineTarget, getPriceListItem);
  const convertQuote = new ConvertQuoteToSalesOrderUseCase(quotes, quoteLines, salesOrders, salesOrderLines, getProduct);
  const cancelQuote = new CancelQuoteUseCase(quotes);

  const createSalesOrder = new CreateSalesOrderUseCase(salesOrders, resolveCustomerTarget);
  const addSalesOrderLine = new AddSalesOrderLineUseCase(salesOrders, salesOrderLines, resolveSalesLineTarget, getPriceListItem);
  const confirmSalesOrder = new ConfirmSalesOrderUseCase(salesOrders, salesOrderLines, createReservation, releaseReservation);
  const cancelSalesOrder = new CancelSalesOrderUseCase(salesOrders, salesOrderLines, releaseReservation);
  const fulfillSalesOrder = new FulfillSalesOrderUseCase(salesOrders, salesOrderLines, releaseReservation, recordIssue);
  const createSalesReturn = new CreateSalesReturnUseCase(salesOrders, salesOrderLines, salesReturns, salesReturnLines, recordReturn);

  const listQuotes = new ListQuotesUseCase(quotes);
  const listQuoteLines = new ListQuoteLinesUseCase(quotes, quoteLines);
  const listSalesOrders = new ListSalesOrdersUseCase(salesOrders);
  const listSalesOrderLines = new ListSalesOrderLinesUseCase(salesOrders, salesOrderLines);
  const listSalesReturns = new ListSalesReturnsUseCase(salesReturns);
  const listSalesReturnLines = new ListSalesReturnLinesUseCase(salesReturns, salesReturnLines);
  const getSalesOrder = new GetSalesOrderUseCase(salesOrders);

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
    getProduct,
    getProductVariant,
    listProductVariants,
    warehouse,
    getWarehouse,
    tax,
    customers,
    customer,
    createCustomer,
    getCustomer,
    otherCompanyCustomer,
    priceList,
    receiveStock,
    balances,
    reservations,
    resolveCustomerTarget,
    resolveSalesLineTarget,
    createQuote,
    addQuoteLine,
    convertQuote,
    cancelQuote,
    createSalesOrder,
    addSalesOrderLine,
    confirmSalesOrder,
    cancelSalesOrder,
    fulfillSalesOrder,
    createSalesReturn,
    listQuotes,
    listQuoteLines,
    listSalesOrders,
    listSalesOrderLines,
    listSalesReturns,
    listSalesReturnLines,
    getSalesOrder,
  };
}

export type SalesTestContext = Awaited<ReturnType<typeof buildSalesTestContext>>;
