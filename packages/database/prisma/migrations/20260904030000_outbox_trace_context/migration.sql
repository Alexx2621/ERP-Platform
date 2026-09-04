-- AlterTable
ALTER TABLE "outbox_messages" ADD COLUMN     "trace_parent" VARCHAR(80),
ADD COLUMN     "trace_state" VARCHAR(512);
