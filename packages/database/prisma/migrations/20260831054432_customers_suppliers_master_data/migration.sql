-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "legal_name" VARCHAR(200),
    "tax_id" VARCHAR(60),
    "email" VARCHAR(200),
    "phone" VARCHAR(40),
    "address_line" VARCHAR(255),
    "city" VARCHAR(100),
    "country" VARCHAR(2),
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "legal_name" VARCHAR(200),
    "tax_id" VARCHAR(60),
    "email" VARCHAR(200),
    "phone" VARCHAR(40),
    "address_line" VARCHAR(255),
    "city" VARCHAR(100),
    "country" VARCHAR(2),
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_tenant_id_company_id_idx" ON "customers"("tenant_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_id_company_id_code_key" ON "customers"("tenant_id", "company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenant_id_company_id_tax_id_key" ON "customers"("tenant_id", "company_id", "tax_id");

-- CreateIndex
CREATE INDEX "suppliers_tenant_id_company_id_idx" ON "suppliers"("tenant_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_tenant_id_company_id_code_key" ON "suppliers"("tenant_id", "company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_tenant_id_company_id_tax_id_key" ON "suppliers"("tenant_id", "company_id", "tax_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
