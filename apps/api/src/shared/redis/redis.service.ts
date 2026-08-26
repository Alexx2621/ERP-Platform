import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import type { EnvironmentVariables } from "../config/environment-variables";

/**
 * Shared Redis connection for cache, distributed rate limiting, locks and
 * BullMQ (MASTER_SPEC §4 "Cache"). `lazyConnect` + an explicit `connect()` in
 * `onModuleInit` mirrors PrismaService's lifecycle: the app fails fast at
 * boot if Redis is unreachable, rather than on the first request that needs it.
 */
@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    super(configService.get("REDIS_URL", { infer: true }), { lazyConnect: true });
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.quit();
    this.logger.log("Redis connection closed");
  }
}
