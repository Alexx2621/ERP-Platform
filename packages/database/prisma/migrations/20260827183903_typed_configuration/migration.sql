-- CreateEnum
CREATE TYPE "ConfigScopeType" AS ENUM ('PLATFORM', 'TENANT', 'COMPANY');

-- CreateEnum
CREATE TYPE "SettingDataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');

-- CreateTable
CREATE TABLE "setting_definitions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(150) NOT NULL,
    "data_type" "SettingDataType" NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "default_value" JSONB NOT NULL,
    "allowed_scopes" "ConfigScopeType"[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "setting_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setting_values" (
    "id" UUID NOT NULL,
    "definition_id" UUID NOT NULL,
    "scope_type" "ConfigScopeType" NOT NULL,
    "tenant_id" UUID,
    "company_id" UUID,
    "scope_key" VARCHAR(80) NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "setting_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "key" VARCHAR(150) NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "setting_definitions_key_key" ON "setting_definitions"("key");

-- CreateIndex
CREATE INDEX "setting_values_tenant_id_idx" ON "setting_values"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "setting_values_definition_id_scope_type_scope_key_key" ON "setting_values"("definition_id", "scope_type", "scope_key");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key_key" ON "user_preferences"("user_id", "key");

-- AddForeignKey
ALTER TABLE "setting_values" ADD CONSTRAINT "setting_values_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "setting_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setting_values" ADD CONSTRAINT "setting_values_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setting_values" ADD CONSTRAINT "setting_values_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
