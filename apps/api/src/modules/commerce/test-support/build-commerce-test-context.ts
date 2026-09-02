import { buildSalesTestContext } from "../../sales/test-support/build-sales-test-context";
import { InMemoryPaymentRepository } from "../../payments/test-support/in-memory-payment.repository";
import { CapturePaymentUseCase } from "../../payments/application/use-cases/capture-payment.use-case";
import { CashPaymentGatewayAdapter } from "../../payments/infrastructure/cash-payment-gateway.adapter";
import { BankTransferPaymentGatewayAdapter } from "../../payments/infrastructure/bank-transfer-payment-gateway.adapter";
import type { PaymentGateway } from "../../payments/application/ports/payment-gateway.port";
import { FindCustomerByEmailUseCase } from "../../customers/application/use-cases/find-customer-by-email.use-case";
import { InMemoryUserRepository } from "../../../core/users/test-support/in-memory-user.repository";
import { InMemoryStorefrontRepository } from "./in-memory-storefront.repository";
import { InMemoryStorefrontProductRepository } from "./in-memory-storefront-product.repository";
import { InMemoryCartRepository } from "./in-memory-cart.repository";
import { InMemoryCartLineRepository } from "./in-memory-cart-line.repository";
import { InMemoryCommerceOrderRepository } from "./in-memory-commerce-order.repository";
import { StorefrontSystemUserSeeder } from "../application/storefront-system-user-seeder";
import { CreateStorefrontUseCase } from "../application/use-cases/create-storefront.use-case";
import { SetStorefrontStatusUseCase } from "../application/use-cases/set-storefront-status.use-case";
import { ListStorefrontsUseCase } from "../application/use-cases/list-storefronts.use-case";
import { PublishProductUseCase } from "../application/use-cases/publish-product.use-case";
import { UnpublishProductUseCase } from "../application/use-cases/unpublish-product.use-case";
import { ListStorefrontProductsUseCase } from "../application/use-cases/list-storefront-products.use-case";
import { ListPublishedProductsUseCase } from "../application/use-cases/list-published-products.use-case";
import { GetPublishedProductUseCase } from "../application/use-cases/get-published-product.use-case";
import { ListCommerceOrdersUseCase } from "../application/use-cases/list-commerce-orders.use-case";
import { GetOrCreateCartUseCase } from "../application/use-cases/get-or-create-cart.use-case";
import { GetCartUseCase } from "../application/use-cases/get-cart.use-case";
import { AddCartLineUseCase } from "../application/use-cases/add-cart-line.use-case";
import { UpdateCartLineQuantityUseCase } from "../application/use-cases/update-cart-line-quantity.use-case";
import { RemoveCartLineUseCase } from "../application/use-cases/remove-cart-line.use-case";
import { CheckoutUseCase } from "../application/use-cases/checkout.use-case";
import { GetCommerceOrderUseCase } from "../application/use-cases/get-commerce-order.use-case";

/**
 * Shared fixture builder for Commerce application-layer tests, mirroring
 * the project's established `buildPosTestContext()`/`buildSalesTestContext()`
 * pattern: real use cases wired to real in-memory repositories across
 * every module Commerce depends on, never mocks. Layers Payments,
 * Customers' guest-lookup, a real system user, and Commerce's own pieces
 * directly on top of a real `buildSalesTestContext()` — same reasoning
 * `buildPosTestContext()` already documented (a second, separate
 * catalog/warehouse store would leave cross-module resolvers unable to see
 * fixtures the other module already created).
 */
export async function buildCommerceTestContext() {
  const sales = await buildSalesTestContext();

  // Payments
  const payments = new InMemoryPaymentRepository();
  const gateways: PaymentGateway[] = [new CashPaymentGatewayAdapter(), new BankTransferPaymentGatewayAdapter()];
  const capturePayment = new CapturePaymentUseCase(payments, gateways, sales.getSalesOrder);

  // Customers (guest lookup) — reuses the exact same customers repo instance
  // `buildSalesTestContext()` already built internally, so a guest customer
  // created via checkout is visible to `CreateSalesOrderUseCase`'s own
  // `ResolveCustomerTargetUseCase` (which reads from that same store),
  // not a disconnected second in-memory store.
  const findCustomerByEmail = new FindCustomerByEmailUseCase(sales.customers);

  // System user
  const users = new InMemoryUserRepository();
  const systemUserSeeder = new StorefrontSystemUserSeeder(users);

  // Commerce
  const storefronts = new InMemoryStorefrontRepository();
  const storefrontProducts = new InMemoryStorefrontProductRepository();
  const carts = new InMemoryCartRepository();
  const cartLines = new InMemoryCartLineRepository();
  const commerceOrders = new InMemoryCommerceOrderRepository();

  const createStorefront = new CreateStorefrontUseCase(storefronts, sales.getWarehouse);
  const setStorefrontStatus = new SetStorefrontStatusUseCase(storefronts);
  const listStorefronts = new ListStorefrontsUseCase(storefronts);

  const publishProduct = new PublishProductUseCase(storefrontProducts, storefronts, sales.getProduct);
  const unpublishProduct = new UnpublishProductUseCase(storefrontProducts, storefronts);
  const listStorefrontProducts = new ListStorefrontProductsUseCase(storefrontProducts, storefronts, sales.getProduct);
  const listPublishedProducts = new ListPublishedProductsUseCase(storefrontProducts, storefronts, sales.getProduct);
  const getPublishedProduct = new GetPublishedProductUseCase(storefrontProducts, storefronts, sales.getProduct, sales.listProductVariants);
  const listCommerceOrders = new ListCommerceOrdersUseCase(commerceOrders);

  const getOrCreateCart = new GetOrCreateCartUseCase(carts);
  const getCart = new GetCartUseCase(carts, cartLines);
  const addCartLine = new AddCartLineUseCase(carts, cartLines, storefrontProducts, sales.getProduct, sales.getProductVariant);
  const updateCartLineQuantity = new UpdateCartLineQuantityUseCase(carts, cartLines);
  const removeCartLine = new RemoveCartLineUseCase(carts, cartLines);

  const checkout = new CheckoutUseCase(
    commerceOrders,
    carts,
    cartLines,
    findCustomerByEmail,
    sales.createCustomer,
    systemUserSeeder,
    sales.createSalesOrder,
    sales.addSalesOrderLine,
    sales.confirmSalesOrder,
    sales.cancelSalesOrder,
    sales.listSalesOrderLines,
    capturePayment,
  );
  const getCommerceOrder = new GetCommerceOrderUseCase(commerceOrders);

  const warehouse = sales.warehouse;
  const storefront = await createStorefront.execute({
    tenantId: sales.tenantId,
    companyId: sales.companyId,
    code: "main-store",
    name: "Tienda principal",
    currency: "USD",
    defaultWarehouseId: warehouse.id,
  });

  return {
    ...sales,
    payments,
    capturePayment,
    findCustomerByEmail,
    users,
    systemUserSeeder,
    storefronts,
    storefrontProducts,
    carts,
    cartLines,
    commerceOrders,
    storefront,
    createStorefront,
    setStorefrontStatus,
    listStorefronts,
    publishProduct,
    unpublishProduct,
    listStorefrontProducts,
    listPublishedProducts,
    getPublishedProduct,
    listCommerceOrders,
    getOrCreateCart,
    getCart,
    addCartLine,
    updateCartLineQuantity,
    removeCartLine,
    checkout,
    getCommerceOrder,
  };
}

export type CommerceTestContext = Awaited<ReturnType<typeof buildCommerceTestContext>>;
