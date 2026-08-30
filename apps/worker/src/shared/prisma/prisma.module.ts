import { Global, Module } from "@nestjs/common";
import { PRISMA_CLIENT as EVENTS_PRISMA_CLIENT } from "@erp/events";
import { PRISMA_CLIENT as NOTIFICATIONS_PRISMA_CLIENT } from "@erp/notifications";
import { PrismaService } from "./prisma.service";

/**
 * Global, same pattern as `apps/api`'s `PrismaModule`. Also satisfies both
 * `@erp/events`'s and `@erp/notifications`'s `PRISMA_CLIENT` tokens via
 * `useExisting` — `PrismaService` extends `PrismaClient`, so it is
 * structurally assignable to either without any adapter code.
 */
@Global()
@Module({
  providers: [
    PrismaService,
    { provide: EVENTS_PRISMA_CLIENT, useExisting: PrismaService },
    { provide: NOTIFICATIONS_PRISMA_CLIENT, useExisting: PrismaService },
  ],
  exports: [PrismaService, EVENTS_PRISMA_CLIENT, NOTIFICATIONS_PRISMA_CLIENT],
})
export class PrismaModule {}
