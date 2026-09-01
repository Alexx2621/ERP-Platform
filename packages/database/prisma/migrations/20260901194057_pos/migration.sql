-- CreateEnum
CREATE TYPE "PosShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PosCashMovementType" AS ENUM ('CASH_IN', 'CASH_OUT');

-- CreateTable
CREATE TABLE "pos_registers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pos_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_shifts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "register_id" UUID NOT NULL,
    "status" "PosShiftStatus" NOT NULL DEFAULT 'OPEN',
    "opened_by_user_id" UUID NOT NULL,
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opening_cash" DECIMAL(14,4) NOT NULL,
    "closed_by_user_id" UUID,
    "closed_at" TIMESTAMPTZ(6),
    "closing_cash_counted" DECIMAL(14,4),
    "closing_cash_expected" DECIMAL(14,4),
    "cash_variance" DECIMAL(14,4),
    "notes" VARCHAR(500),

    CONSTRAINT "pos_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_cash_movements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "type" "PosCashMovementType" NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "recorded_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_sales" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "sales_order_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(100) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "amount_tendered" DECIMAL(14,4),
    "change_due" DECIMAL(14,4),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_returns" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,
    "pos_sale_id" UUID NOT NULL,
    "sales_return_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(100) NOT NULL,
    "refunded" BOOLEAN NOT NULL DEFAULT false,
    "refund_amount" DECIMAL(14,4),
    "refund_method" "PaymentMethod",
    "reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_returns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pos_registers_tenant_id_company_id_idx" ON "pos_registers"("tenant_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "pos_registers_tenant_id_id_key" ON "pos_registers"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "pos_registers_tenant_id_company_id_code_key" ON "pos_registers"("tenant_id", "company_id", "code");

-- CreateIndex
CREATE INDEX "pos_shifts_tenant_id_company_id_register_id_status_idx" ON "pos_shifts"("tenant_id", "company_id", "register_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pos_shifts_tenant_id_id_key" ON "pos_shifts"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "pos_cash_movements_tenant_id_shift_id_idx" ON "pos_cash_movements"("tenant_id", "shift_id");

-- CreateIndex
CREATE INDEX "pos_sales_tenant_id_company_id_shift_id_idx" ON "pos_sales"("tenant_id", "company_id", "shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "pos_sales_tenant_id_id_key" ON "pos_sales"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "pos_sales_tenant_id_company_id_idempotency_key_key" ON "pos_sales"("tenant_id", "company_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "pos_sales_tenant_id_sales_order_id_key" ON "pos_sales"("tenant_id", "sales_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "pos_sales_tenant_id_payment_id_key" ON "pos_sales"("tenant_id", "payment_id");

-- CreateIndex
CREATE INDEX "pos_returns_tenant_id_company_id_shift_id_idx" ON "pos_returns"("tenant_id", "company_id", "shift_id");

-- CreateIndex
CREATE INDEX "pos_returns_tenant_id_pos_sale_id_idx" ON "pos_returns"("tenant_id", "pos_sale_id");

-- CreateIndex
CREATE UNIQUE INDEX "pos_returns_tenant_id_id_key" ON "pos_returns"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "pos_returns_tenant_id_company_id_idempotency_key_key" ON "pos_returns"("tenant_id", "company_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "pos_returns_tenant_id_sales_return_id_key" ON "pos_returns"("tenant_id", "sales_return_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_tenant_id_id_key" ON "payments"("tenant_id", "id");

-- AddForeignKey
ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_registers" ADD CONSTRAINT "pos_registers_tenant_id_warehouse_id_fkey" FOREIGN KEY ("tenant_id", "warehouse_id") REFERENCES "warehouses"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_tenant_id_register_id_fkey" FOREIGN KEY ("tenant_id", "register_id") REFERENCES "pos_registers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_opened_by_user_id_fkey" FOREIGN KEY ("opened_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_shifts" ADD CONSTRAINT "pos_shifts_closed_by_user_id_fkey" FOREIGN KEY ("closed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_tenant_id_shift_id_fkey" FOREIGN KEY ("tenant_id", "shift_id") REFERENCES "pos_shifts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_cash_movements" ADD CONSTRAINT "pos_cash_movements_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_tenant_id_shift_id_fkey" FOREIGN KEY ("tenant_id", "shift_id") REFERENCES "pos_shifts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_tenant_id_sales_order_id_fkey" FOREIGN KEY ("tenant_id", "sales_order_id") REFERENCES "sales_orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sales" ADD CONSTRAINT "pos_sales_tenant_id_payment_id_fkey" FOREIGN KEY ("tenant_id", "payment_id") REFERENCES "payments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_tenant_id_shift_id_fkey" FOREIGN KEY ("tenant_id", "shift_id") REFERENCES "pos_shifts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_tenant_id_pos_sale_id_fkey" FOREIGN KEY ("tenant_id", "pos_sale_id") REFERENCES "pos_sales"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_returns" ADD CONSTRAINT "pos_returns_tenant_id_sales_return_id_fkey" FOREIGN KEY ("tenant_id", "sales_return_id") REFERENCES "sales_returns"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

