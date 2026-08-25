import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createPrismaClientOptions, PrismaClient } from "@erp/database";
import type { EnvironmentVariables } from "../config/environment-variables";

/**
 * Thin Nest lifecycle wrapper around the shared PrismaClient factory.
 * Domain and application layers never import this directly (see
 * docs/ARCHITECTURE.md §6): only infrastructure repositories depend on it.
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
