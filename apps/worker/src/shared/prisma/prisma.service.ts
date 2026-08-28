import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createPrismaClientOptions, PrismaClient } from "@erp/database";
import type { EnvironmentVariables } from "../config/environment-variables";

/**
 * Thin Nest lifecycle wrapper around the shared PrismaClient factory — same
 * shape as `apps/api`'s own `PrismaService`. Duplicated rather than shared
 * because it is ~15 lines of Nest lifecycle boilerplate over
 * `createPrismaClientOptions` (already shared via `@erp/database`); a
 * dedicated package for this would be more machinery than the duplication
 * it removes.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    super(
      createPrismaClientOptions({
        connectionString: configService.get("DATABASE_URL", { infer: true }),
      }),
    );
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log("Prisma connection closed");
  }
}
