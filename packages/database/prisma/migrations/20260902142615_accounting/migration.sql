-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FiscalPeriodStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "parent_account_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" "AccountType" NOT NULL,
    "status" "MasterDataStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_periods" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "FiscalPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "closed_at" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fiscal_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "fiscal_period_id" UUID NOT NULL,
    "entry_date" DATE NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "source_type" VARCHAR(100),
    "source_id" VARCHAR(100),
    "reversal_of_entry_id" UUID,
    "reversed_by_entry_id" UUID,
    "reversed_at" TIMESTAMPTZ(6),
    "created_by_user_id" UUID NOT NULL,
    "correlation_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry_lines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "journal_entry_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "line_number" INTEGER NOT NULL,
    "debit" DECIMAL(14,4) NOT NULL,
    "credit" DECIMAL(14,4) NOT NULL,
    "description" VARCHAR(300),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entry_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_tenant_id_company_id_idx" ON "accounts"("tenant_id", "company_id");

-- CreateIndex
CREATE INDEX "accounts_tenant_id_parent_account_id_idx" ON "accounts"("tenant_id", "parent_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_tenant_id_id_key" ON "accounts"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_tenant_id_company_id_code_key" ON "accounts"("tenant_id", "company_id", "code");

-- CreateIndex
CREATE INDEX "fiscal_periods_tenant_id_company_id_idx" ON "fiscal_periods"("tenant_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_periods_tenant_id_id_key" ON "fiscal_periods"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_periods_tenant_id_company_id_code_key" ON "fiscal_periods"("tenant_id", "company_id", "code");

-- CreateIndex
CREATE INDEX "journal_entries_tenant_id_company_id_entry_date_idx" ON "journal_entries"("tenant_id", "company_id", "entry_date");

-- CreateIndex
CREATE INDEX "journal_entries_tenant_id_fiscal_period_id_idx" ON "journal_entries"("tenant_id", "fiscal_period_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_tenant_id_id_key" ON "journal_entries"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_tenant_id_company_id_source_type_source_id_key" ON "journal_entries"("tenant_id", "company_id", "source_type", "source_id");

-- CreateIndex
CREATE INDEX "journal_entry_lines_tenant_id_journal_entry_id_idx" ON "journal_entry_lines"("tenant_id", "journal_entry_id");

-- CreateIndex
CREATE INDEX "journal_entry_lines_tenant_id_account_id_idx" ON "journal_entry_lines"("tenant_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entry_lines_tenant_id_journal_entry_id_line_number_key" ON "journal_entry_lines"("tenant_id", "journal_entry_id", "line_number");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_parent_account_id_fkey" FOREIGN KEY ("tenant_id", "parent_account_id") REFERENCES "accounts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_fiscal_period_id_fkey" FOREIGN KEY ("tenant_id", "fiscal_period_id") REFERENCES "fiscal_periods"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_tenant_id_journal_entry_id_fkey" FOREIGN KEY ("tenant_id", "journal_entry_id") REFERENCES "journal_entries"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_tenant_id_account_id_fkey" FOREIGN KEY ("tenant_id", "account_id") REFERENCES "accounts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

