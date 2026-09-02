-- CreateEnum
CREATE TYPE "StorefrontStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StorefrontProductStatus" AS ENUM ('PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('OPEN', 'CONVERTED');

-- CreateTable
CREATE TABLE "storefronts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "default_warehouse_id" UUID,
    "code" VARCHAR(63) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "domain" VARCHAR(255),
    "currency" VARCHAR(3) NOT NULL,
    "status" "StorefrontStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "storefronts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storefront_products" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "storefront_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "status" "StorefrontProductStatus" NOT NULL DEFAULT 'PUBLISHED',
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storefront_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "storefront_id" UUID NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "CartStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_lines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_variant_id" UUID,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit_price" DECIMAL(14,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cart_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_orders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "storefront_id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "sales_order_id" UUID NOT NULL,
    "payment_id" UUID,
    "customer_id" UUID NOT NULL,
    "guest_email" VARCHAR(200) NOT NULL,
    "total" DECIMAL(14,4) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commerce_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "storefronts_code_key" ON "storefronts"("code");

-- CreateIndex
CREATE INDEX "storefronts_tenant_id_company_id_idx" ON "storefronts"("tenant_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "storefronts_tenant_id_id_key" ON "storefronts"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "storefront_products_tenant_id_storefront_id_status_idx" ON "storefront_products"("tenant_id", "storefront_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "storefront_products_tenant_id_storefront_id_product_id_key" ON "storefront_products"("tenant_id", "storefront_id", "product_id");

-- CreateIndex
CREATE INDEX "carts_tenant_id_storefront_id_status_idx" ON "carts"("tenant_id", "storefront_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "carts_tenant_id_id_key" ON "carts"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "cart_lines_tenant_id_cart_id_idx" ON "cart_lines"("tenant_id", "cart_id");

-- CreateIndex
CREATE INDEX "commerce_orders_tenant_id_company_id_storefront_id_idx" ON "commerce_orders"("tenant_id", "company_id", "storefront_id");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_orders_tenant_id_id_key" ON "commerce_orders"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_orders_tenant_id_cart_id_key" ON "commerce_orders"("tenant_id", "cart_id");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_orders_tenant_id_sales_order_id_key" ON "commerce_orders"("tenant_id", "sales_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_orders_tenant_id_payment_id_key" ON "commerce_orders"("tenant_id", "payment_id");

-- AddForeignKey
ALTER TABLE "storefronts" ADD CONSTRAINT "storefronts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storefronts" ADD CONSTRAINT "storefronts_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storefronts" ADD CONSTRAINT "storefronts_tenant_id_default_warehouse_id_fkey" FOREIGN KEY ("tenant_id", "default_warehouse_id") REFERENCES "warehouses"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storefront_products" ADD CONSTRAINT "storefront_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storefront_products" ADD CONSTRAINT "storefront_products_tenant_id_storefront_id_fkey" FOREIGN KEY ("tenant_id", "storefront_id") REFERENCES "storefronts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storefront_products" ADD CONSTRAINT "storefront_products_tenant_id_product_id_fkey" FOREIGN KEY ("tenant_id", "product_id") REFERENCES "products"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_tenant_id_storefront_id_fkey" FOREIGN KEY ("tenant_id", "storefront_id") REFERENCES "storefronts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_lines" ADD CONSTRAINT "cart_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_lines" ADD CONSTRAINT "cart_lines_tenant_id_cart_id_fkey" FOREIGN KEY ("tenant_id", "cart_id") REFERENCES "carts"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_lines" ADD CONSTRAINT "cart_lines_tenant_id_product_id_fkey" FOREIGN KEY ("tenant_id", "product_id") REFERENCES "products"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_lines" ADD CONSTRAINT "cart_lines_tenant_id_product_variant_id_fkey" FOREIGN KEY ("tenant_id", "product_variant_id") REFERENCES "product_variants"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_tenant_id_storefront_id_fkey" FOREIGN KEY ("tenant_id", "storefront_id") REFERENCES "storefronts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_tenant_id_cart_id_fkey" FOREIGN KEY ("tenant_id", "cart_id") REFERENCES "carts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_tenant_id_sales_order_id_fkey" FOREIGN KEY ("tenant_id", "sales_order_id") REFERENCES "sales_orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_tenant_id_payment_id_fkey" FOREIGN KEY ("tenant_id", "payment_id") REFERENCES "payments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_tenant_id_customer_id_fkey" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

