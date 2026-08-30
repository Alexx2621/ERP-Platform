import { Global, Module } from "@nestjs/common";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "./prisma.service";

/**
 * Global, same pattern as `apps/worker`'s `PrismaModule`. Also satisfies
 * `@erp/notifications`'s `PRISMA_CLIENT` token via `useExisting` —
 * `PrismaService` extends `PrismaClient`, so it is structurally assignable
 * without any adapter code.
 */
@Global()
@Module({
  providers: [PrismaService, { provide: NOTIFICATIONS_PRISMA_CLIENT, useExisting: PrismaService }],
  exports: [PrismaService, NOTIFICATIONS_PRISMA_CLIENT],
})
export class PrismaModule {}
