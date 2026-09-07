-- Human-readable document numbers for Quote and SalesOrder, plus the
-- per-company counter behind them.
--
-- `prisma migrate diff` generates a bare `ADD COLUMN "number" VARCHAR(30)
-- NOT NULL`, which cannot apply to these tables: they already hold real
-- rows (~100 sales orders per tenant in the seeded demo tenants alone), and
-- there is no sensible column default for a per-company correlative. This
-- migration is therefore hand-written to add the column nullable, backfill
-- every existing row with a real sequential number in creation order, seed
-- the counters past those numbers, and only then enforce NOT NULL/UNIQUE.

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "document_type" VARCHAR(40) NOT NULL,
    "prefix" VARCHAR(10) NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_tenant_id_company_id_document_type_key" ON "document_sequences"("tenant_id", "company_id", "document_type");

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable (nullable first, so existing rows can be backfilled)
ALTER TABLE "quotes" ADD COLUMN "number" VARCHAR(30);
ALTER TABLE "sales_orders" ADD COLUMN "number" VARCHAR(30);

-- Backfill: number every existing document per company, in creation order,
-- so the correlative reflects the real chronological sequence.
UPDATE "quotes" AS q
SET "number" = 'COT-' || LPAD(ranked.row_number::text, 6, '0')
FROM (
    SELECT "id",
           ROW_NUMBER() OVER (PARTITION BY "tenant_id", "company_id" ORDER BY "created_at", "id") AS row_number
    FROM "quotes"
) AS ranked
WHERE q."id" = ranked."id";

UPDATE "sales_orders" AS o
SET "number" = 'PED-' || LPAD(ranked.row_number::text, 6, '0')
FROM (
    SELECT "id",
           ROW_NUMBER() OVER (PARTITION BY "tenant_id", "company_id" ORDER BY "created_at", "id") AS row_number
    FROM "sales_orders"
) AS ranked
WHERE o."id" = ranked."id";

-- Seed the counters past whatever the backfill just consumed, so the first
-- document created after this migration continues the sequence instead of
-- colliding with a backfilled number.
INSERT INTO "document_sequences" ("id", "tenant_id", "company_id", "document_type", "prefix", "next_value", "created_at", "updated_at")
SELECT gen_random_uuid(), "tenant_id", "company_id", 'SALES_QUOTE', 'COT', COUNT(*)::int + 1, now(), now()
FROM "quotes"
GROUP BY "tenant_id", "company_id"
ON CONFLICT ("tenant_id", "company_id", "document_type") DO NOTHING;

INSERT INTO "document_sequences" ("id", "tenant_id", "company_id", "document_type", "prefix", "next_value", "created_at", "updated_at")
SELECT gen_random_uuid(), "tenant_id", "company_id", 'SALES_ORDER', 'PED', COUNT(*)::int + 1, now(), now()
FROM "sales_orders"
GROUP BY "tenant_id", "company_id"
ON CONFLICT ("tenant_id", "company_id", "document_type") DO NOTHING;

-- Now that every row has a value, enforce the real constraints.
ALTER TABLE "quotes" ALTER COLUMN "number" SET NOT NULL;
ALTER TABLE "sales_orders" ALTER COLUMN "number" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "quotes_tenant_id_company_id_number_key" ON "quotes"("tenant_id", "company_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_tenant_id_company_id_number_key" ON "sales_orders"("tenant_id", "company_id", "number");
