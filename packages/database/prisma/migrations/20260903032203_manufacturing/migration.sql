
-- CreateEnum
CREATE TYPE "ProductionOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductionOrderMaterialMovementType" AS ENUM ('ISSUE', 'RETURN');

-- AlterEnum
ALTER TYPE "InventoryMovementReferenceType" ADD VALUE 'PRODUCTION_ORDER';

-- CreateTable
CREATE TABLE "bill_of_materials" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bill_of_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_of_material_components" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "bill_of_material_id" UUID NOT NULL,
    "component_product_id" UUID NOT NULL,
    "component_variant_id" UUID,
    "quantity_per_unit" DECIMAL(14,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_of_material_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_orders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "bill_of_material_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "quantity_planned" DECIMAL(14,4) NOT NULL,
    "status" "ProductionOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "confirmed_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),

    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_order_materials" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "production_order_id" UUID NOT NULL,
    "component_product_id" UUID NOT NULL,
    "component_variant_id" UUID,
    "quantity_required" DECIMAL(14,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_order_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_order_material_movements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "production_order_material_id" UUID NOT NULL,
    "type" "ProductionOrderMaterialMovementType" NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_order_material_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_order_operations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "production_order_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_order_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_order_finished_goods_receipts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "production_order_id" UUID NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_order_finished_goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bill_of_materials_tenant_id_company_id_status_idx" ON "bill_of_materials"("tenant_id", "company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bill_of_materials_tenant_id_id_key" ON "bill_of_materials"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "bill_of_materials_tenant_id_company_id_product_id_version_key" ON "bill_of_materials"("tenant_id", "company_id", "product_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "bill_of_materials_tenant_id_company_id_code_key" ON "bill_of_materials"("tenant_id", "company_id", "code");

-- CreateIndex
CREATE INDEX "bill_of_material_components_tenant_id_bill_of_material_id_idx" ON "bill_of_material_components"("tenant_id", "bill_of_material_id");

-- CreateIndex
CREATE INDEX "production_orders_tenant_id_company_id_status_idx" ON "production_orders"("tenant_id", "company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "production_orders_tenant_id_id_key" ON "production_orders"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "production_order_materials_tenant_id_production_order_id_idx" ON "production_order_materials"("tenant_id", "production_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "production_order_materials_tenant_id_id_key" ON "production_order_materials"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "production_order_material_movements_tenant_id_production_or_idx" ON "production_order_material_movements"("tenant_id", "production_order_material_id");

-- CreateIndex
CREATE INDEX "production_order_operations_tenant_id_production_order_id_idx" ON "production_order_operations"("tenant_id", "production_order_id");

-- CreateIndex
CREATE INDEX "production_order_finished_goods_receipts_tenant_id_producti_idx" ON "production_order_finished_goods_receipts"("tenant_id", "production_order_id");

-- AddForeignKey
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_tenant_id_product_id_fkey" FOREIGN KEY ("tenant_id", "product_id") REFERENCES "products"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_of_material_components" ADD CONSTRAINT "bill_of_material_components_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_of_material_components" ADD CONSTRAINT "bill_of_material_components_tenant_id_bill_of_material_id_fkey" FOREIGN KEY ("tenant_id", "bill_of_material_id") REFERENCES "bill_of_materials"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_of_material_components" ADD CONSTRAINT "bill_of_material_components_tenant_id_component_product_id_fkey" FOREIGN KEY ("tenant_id", "component_product_id") REFERENCES "products"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_of_material_components" ADD CONSTRAINT "bill_of_material_components_tenant_id_component_variant_id_fkey" FOREIGN KEY ("tenant_id", "component_variant_id") REFERENCES "product_variants"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_tenant_id_bill_of_material_id_fkey" FOREIGN KEY ("tenant_id", "bill_of_material_id") REFERENCES "bill_of_materials"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_tenant_id_product_id_fkey" FOREIGN KEY ("tenant_id", "product_id") REFERENCES "products"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_tenant_id_warehouse_id_fkey" FOREIGN KEY ("tenant_id", "warehouse_id") REFERENCES "warehouses"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_materials" ADD CONSTRAINT "production_order_materials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_materials" ADD CONSTRAINT "production_order_materials_tenant_id_production_order_id_fkey" FOREIGN KEY ("tenant_id", "production_order_id") REFERENCES "production_orders"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_materials" ADD CONSTRAINT "production_order_materials_tenant_id_component_product_id_fkey" FOREIGN KEY ("tenant_id", "component_product_id") REFERENCES "products"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_materials" ADD CONSTRAINT "production_order_materials_tenant_id_component_variant_id_fkey" FOREIGN KEY ("tenant_id", "component_variant_id") REFERENCES "product_variants"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_material_movements" ADD CONSTRAINT "production_order_material_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_material_movements" ADD CONSTRAINT "production_order_material_movements_tenant_id_production_o_fkey" FOREIGN KEY ("tenant_id", "production_order_material_id") REFERENCES "production_order_materials"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_operations" ADD CONSTRAINT "production_order_operations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_operations" ADD CONSTRAINT "production_order_operations_tenant_id_production_order_id_fkey" FOREIGN KEY ("tenant_id", "production_order_id") REFERENCES "production_orders"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_finished_goods_receipts" ADD CONSTRAINT "production_order_finished_goods_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_order_finished_goods_receipts" ADD CONSTRAINT "production_order_finished_goods_receipts_tenant_id_product_fkey" FOREIGN KEY ("tenant_id", "production_order_id") REFERENCES "production_orders"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

