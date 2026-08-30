-- CreateEnum
CREATE TYPE "AppKind" AS ENUM ('BUSINESS_APP', 'CHANNEL', 'INTEGRATION', 'INDUSTRY_EXTENSION');

-- CreateEnum
CREATE TYPE "TenantAppStatus" AS ENUM ('ENABLED', 'DISABLED');

-- CreateTable
CREATE TABLE "app_definitions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(60) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "version" VARCHAR(30) NOT NULL,
    "kind" "AppKind" NOT NULL,
    "depends_on_keys" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_apps" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "app_definition_id" UUID NOT NULL,
    "status" "TenantAppStatus" NOT NULL,
    "enabled_at" TIMESTAMPTZ(6) NOT NULL,
    "disabled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_configurations" (
    "id" UUID NOT NULL,
    "tenant_app_id" UUID NOT NULL,
    "key" VARCHAR(150) NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_definitions_key_key" ON "app_definitions"("key");

-- CreateIndex
CREATE INDEX "tenant_apps_tenant_id_idx" ON "tenant_apps"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_apps_tenant_id_app_definition_id_key" ON "tenant_apps"("tenant_id", "app_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_configurations_tenant_app_id_key_key" ON "app_configurations"("tenant_app_id", "key");

-- AddForeignKey
ALTER TABLE "tenant_apps" ADD CONSTRAINT "tenant_apps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_apps" ADD CONSTRAINT "tenant_apps_app_definition_id_fkey" FOREIGN KEY ("app_definition_id") REFERENCES "app_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_configurations" ADD CONSTRAINT "app_configurations_tenant_app_id_fkey" FOREIGN KEY ("tenant_app_id") REFERENCES "tenant_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
