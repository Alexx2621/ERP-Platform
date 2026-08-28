import { Global, Module } from "@nestjs/common";
import { PRISMA_CLIENT } from "@erp/events";
import { PrismaService } from "./prisma.service";

/**
 * Global, same pattern as `apps/api`'s `PrismaModule`. Also satisfies
 * `@erp/events`'s `PRISMA_CLIENT` token via `useExisting` — `PrismaService`
 * extends `PrismaClient`, so it is structurally assignable without any
 * adapter code.
 */
@Global()
@Module({
  providers: [PrismaService, { provide: PRISMA_CLIENT, useExisting: PrismaService }],
  exports: [PrismaService, PRISMA_CLIENT],
})
export class PrismaModule {}
