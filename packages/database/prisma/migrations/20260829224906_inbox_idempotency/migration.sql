-- CreateEnum
CREATE TYPE "InboxMessageStatus" AS ENUM ('PROCESSING', 'PROCESSED');

-- CreateTable
CREATE TABLE "inbox_messages" (
    "id" UUID NOT NULL,
    "consumer_name" VARCHAR(100) NOT NULL,
    "message_id" UUID NOT NULL,
    "tenant_id" UUID,
    "status" "InboxMessageStatus" NOT NULL DEFAULT 'PROCESSING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error_code" VARCHAR(150),
    "locked_at" TIMESTAMPTZ(6) NOT NULL,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inbox_messages_status_locked_at_idx" ON "inbox_messages"("status", "locked_at");

-- CreateIndex
CREATE UNIQUE INDEX "inbox_messages_consumer_name_message_id_key" ON "inbox_messages"("consumer_name", "message_id");

-- AddForeignKey
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
