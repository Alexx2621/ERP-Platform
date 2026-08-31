-- CreateEnum
CREATE TYPE "MasterDataStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('PHYSICAL_GOOD', 'SERVICE', 'DIGITAL_PRODUCT', 'RAW_MATERIAL');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');

-- CreateTable
CREATE TABLE "units_of_measure" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(10) NOT NULL,
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "units_of_measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "parent_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "category_id" UUID,
    "brand_id" UUID,
    "unit_of_measure_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "type" "ProductType" NOT NULL DEFAULT 'PHYSICAL_GOOD',
    "track_inventory" BOOLEAN NOT NULL DEFAULT true,
    "sellable" BOOLEAN NOT NULL DEFAULT true,
    "purchasable" BOOLEAN NOT NULL DEFAULT true,
    "has_variants" BOOLEAN NOT NULL DEFAULT false,
    "publish_online" BOOLEAN NOT NULL DEFAULT false,
    "barcode" VARCHAR(64),
    "base_price" DECIMAL(14,4),
    "base_cost" DECIMAL(14,4),
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "barcode" VARCHAR(64),
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "price" DECIMAL(14,4) NOT NULL,
    "cost" DECIMAL(14,4),
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "units_of_measure_tenant_id_company_id_idx" ON "units_of_measure"("tenant_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "units_of_measure_tenant_id_id_key" ON "units_of_measure"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "units_of_measure_tenant_id_company_id_code_key" ON "units_of_measure"("tenant_id", "company_id", "code");

-- CreateIndex
CREATE INDEX "categories_tenant_id_company_id_idx" ON "categories"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "categories_tenant_id_parent_id_idx" ON "categories"("tenant_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_tenant_id_id_key" ON "categories"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_tenant_id_company_id_code_key" ON "categories"("tenant_id", "company_id", "code");

-- CreateIndex
CREATE INDEX "brands_tenant_id_company_id_idx" ON "brands"("tenant_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_tenant_id_id_key" ON "brands"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_tenant_id_company_id_code_key" ON "brands"("tenant_id", "company_id", "code");

-- CreateIndex
CREATE INDEX "products_tenant_id_company_id_idx" ON "products"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "products_tenant_id_category_id_idx" ON "products"("tenant_id", "category_id");

-- CreateIndex
CREATE INDEX "products_tenant_id_brand_id_idx" ON "products"("tenant_id", "brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_id_key" ON "products"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_company_id_code_key" ON "products"("tenant_id", "company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_company_id_barcode_key" ON "products"("tenant_id", "company_id", "barcode");

-- CreateIndex
CREATE INDEX "product_variants_tenant_id_product_id_idx" ON "product_variants"("tenant_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_tenant_id_sku_key" ON "product_variants"("tenant_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_tenant_id_product_id_attributes_key" ON "product_variants"("tenant_id", "product_id", "attributes");

-- AddForeignKey
ALTER TABLE "units_of_measure" ADD CONSTRAINT "units_of_measure_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units_of_measure" ADD CONSTRAINT "units_of_measure_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_parent_id_fkey" FOREIGN KEY ("tenant_id", "parent_id") REFERENCES "categories"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_category_id_fkey" FOREIGN KEY ("tenant_id", "category_id") REFERENCES "categories"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_unit_of_measure_id_fkey" FOREIGN KEY ("tenant_id", "unit_of_measure_id") REFERENCES "units_of_measure"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_tenant_id_product_id_fkey" FOREIGN KEY ("tenant_id", "product_id") REFERENCES "products"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
