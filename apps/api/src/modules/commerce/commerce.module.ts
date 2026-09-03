import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import { AuthModule } from "../../core/auth";
import { TenantsModule } from "../../core/tenants";
import { AccessControlModule } from "../../core/access-control";
import { AuditModule } from "../../core/audit";
import { AppRegistryModule } from "../../core/app-registry";
import { UsersModule } from "../../core/users";
import { RedisService } from "../../shared/redis/redis.service";
import type { EnvironmentVariables } from "../../shared/config/environment-variables";
import { CatalogModule } from "../catalog";
import { WarehousesModule } from "../warehouses";
import { CustomersModule } from "../customers";
import { SalesModule } from "../sales";
import { PaymentsModule } from "../payments";
import { STOREFRONT_REPOSITORY } from "./domain/storefront.repository";
import { STOREFRONT_PRODUCT_REPOSITORY } from "./domain/storefront-product.repository";
import { CART_REPOSITORY } from "./domain/cart.repository";
import { CART_LINE_REPOSITORY } from "./domain/cart-line.repository";
import { COMMERCE_ORDER_REPOSITORY } from "./domain/commerce-order.repository";
import { PrismaStorefrontRepository } from "./infrastructure/prisma-storefront.repository";
import { PrismaStorefrontProductRepository } from "./infrastructure/prisma-storefront-product.repository";
import { PrismaCartRepository } from "./infrastructure/prisma-cart.repository";
import { PrismaCartLineRepository } from "./infrastructure/prisma-cart-line.repository";
import { PrismaCommerceOrderRepository } from "./infrastructure/prisma-commerce-order.repository";
import { StorefrontSystemUserSeeder } from "./application/storefront-system-user-seeder";
import { CreateStorefrontUseCase } from "./application/use-cases/create-storefront.use-case";
import { SetStorefrontStatusUseCase } from "./application/use-cases/set-storefront-status.use-case";
import { ListStorefrontsUseCase } from "./application/use-cases/list-storefronts.use-case";
import { PublishProductUseCase } from "./application/use-cases/publish-product.use-case";
import { UnpublishProductUseCase } from "./application/use-cases/unpublish-product.use-case";
import { ListStorefrontProductsUseCase } from "./application/use-cases/list-storefront-products.use-case";
import { ListPublishedProductsUseCase } from "./application/use-cases/list-published-products.use-case";
import { GetPublishedProductUseCase } from "./application/use-cases/get-published-product.use-case";
import { ListCommerceOrdersUseCase } from "./application/use-cases/list-commerce-orders.use-case";
import { GetOrCreateCartUseCase } from "./application/use-cases/get-or-create-cart.use-case";
import { GetCartUseCase } from "./application/use-cases/get-cart.use-case";
import { AddCartLineUseCase } from "./application/use-cases/add-cart-line.use-case";
import { UpdateCartLineQuantityUseCase } from "./application/use-cases/update-cart-line-quantity.use-case";
import { RemoveCartLineUseCase } from "./application/use-cases/remove-cart-line.use-case";
import { CheckoutUseCase } from "./application/use-cases/checkout.use-case";
import { GetCommerceOrderUseCase } from "./application/use-cases/get-commerce-order.use-case";
import { StorefrontsController } from "./presentation/storefronts.controller";
import { StorefrontPublicController } from "./presentation/storefront-public.controller";
import { PublicStorefrontContextGuard } from "./presentation/public-storefront-context.guard";

/**
 * Phase 7A (Commerce Engine) module. Six direct, cycle-free dependencies
 * (docs/ARCHITECTURE.md §6) — the widest fan-out of any module in this
 * codebase so far, because `CheckoutUseCase` is, like POS's own
 * `RingUpSaleUseCase`, an orchestrator with no transactional domain of its
 * own: Catalog (published product detail), Warehouses (a storefront's
 * default warehouse), Customers (guest resolution), Sales (the real
 * `SalesOrder` a checkout creates), Payments (an optional `BANK_TRANSFER`
 * capture), Users (the non-interactive "Storefront System" actor
 * `StorefrontSystemUserSeeder` seeds — see that class's own docstring for
 * why an anonymous checkout still needs a real, non-null actor for
 * Inventory's own `createdByUserId`). Its own `ThrottlerModule` — separate
 * from `AuthModule`'s, a different traffic shape entirely — rate-limits
 * the public, unauthenticated `StorefrontPublicController` only;
 * `StorefrontsController` (admin) relies on the ordinary session/permission
 * guards every other module already uses.
 */
@Module({
  imports: [
    AuthModule,
    TenantsModule,
    AccessControlModule,
    AuditModule,
    UsersModule,
    CatalogModule,
    WarehousesModule,
    CustomersModule,
    SalesModule,
    PaymentsModule,
    AppRegistryModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService, RedisService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>, redis: RedisService) => ({
        throttlers: [
          {
            ttl: config.get("COMMERCE_RATE_LIMIT_WINDOW_SECONDS", { infer: true }) * 1000,
            limit: config.get("COMMERCE_RATE_LIMIT_MAX", { infer: true }),
          },
        ],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
  ],
  controllers: [StorefrontsController, StorefrontPublicController],
  providers: [
    { provide: STOREFRONT_REPOSITORY, useClass: PrismaStorefrontRepository },
    { provide: STOREFRONT_PRODUCT_REPOSITORY, useClass: PrismaStorefrontProductRepository },
    { provide: CART_REPOSITORY, useClass: PrismaCartRepository },
    { provide: CART_LINE_REPOSITORY, useClass: PrismaCartLineRepository },
    { provide: COMMERCE_ORDER_REPOSITORY, useClass: PrismaCommerceOrderRepository },
    StorefrontSystemUserSeeder,
    PublicStorefrontContextGuard,
    CreateStorefrontUseCase,
    SetStorefrontStatusUseCase,
    ListStorefrontsUseCase,
    PublishProductUseCase,
    UnpublishProductUseCase,
    ListStorefrontProductsUseCase,
    ListPublishedProductsUseCase,
    GetPublishedProductUseCase,
    ListCommerceOrdersUseCase,
    GetOrCreateCartUseCase,
    GetCartUseCase,
    AddCartLineUseCase,
    UpdateCartLineQuantityUseCase,
    RemoveCartLineUseCase,
    CheckoutUseCase,
    GetCommerceOrderUseCase,
  ],
  exports: [ListPublishedProductsUseCase, GetPublishedProductUseCase],
})
export class CommerceModule {}
