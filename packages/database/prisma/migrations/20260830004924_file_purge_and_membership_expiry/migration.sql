-- AlterEnum
ALTER TYPE "FileObjectStatus" ADD VALUE 'PURGED';

-- AlterTable
ALTER TABLE "file_objects" ADD COLUMN     "purged_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "file_objects_status_deleted_at_idx" ON "file_objects"("status", "deleted_at");
