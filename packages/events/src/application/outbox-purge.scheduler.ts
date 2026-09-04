import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PurgePublishedOutboxMessagesUseCase } from "./use-cases/purge-published-outbox-messages.use-case";

/**
 * Deliberately a minimal interface, not a specific app's full
 * `EnvironmentVariables` class — same reasoning as
 * `OutboxDispatcherEnvironment`, so any consuming app's config is
 * structurally assignable without this package depending on that app.
 */
export interface OutboxPurgeEnvironment {
  OUTBOX_PURGE_INTERVAL_MS: number;
  OUTBOX_PURGE_RETENTION_DAYS: number;
  OUTBOX_PURGE_BATCH_SIZE: number;
}

/**
 * Same plain-`setInterval` shape as `OutboxDispatcherScheduler`/
 * `FilePurgeScheduler` — a single periodic tick needs no cron semantics.
 * Runs alongside the dispatcher inside `apps/worker`, the natural home
 * since both operate on the same table and process.
 */
@Injectable()
export class OutboxPurgeScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPurgeScheduler.name);
  private timer: NodeJS.Timeout | undefined;
  private ticking = false;

  constructor(
    private readonly purgePublishedOutboxMessages: PurgePublishedOutboxMessagesUseCase,
    private readonly config: ConfigService<OutboxPurgeEnvironment, true>,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.config.get("OUTBOX_PURGE_INTERVAL_MS", { infer: true });
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.timer.unref();
    this.logger.log(
      `Outbox purge scheduler started (intervalMs=${intervalMs}, retentionDays=${this.config.get("OUTBOX_PURGE_RETENTION_DAYS", { infer: true })})`,
    );
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const result = await this.purgePublishedOutboxMessages.execute({
        retentionDays: this.config.get("OUTBOX_PURGE_RETENTION_DAYS", { infer: true }),
        batchSize: this.config.get("OUTBOX_PURGE_BATCH_SIZE", { infer: true }),
      });
      if (result.purged > 0) {
        this.logger.log(`Outbox purge: purged=${result.purged}`);
      }
    } catch (error) {
      this.logger.error(
        "Outbox purge tick failed",
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.ticking = false;
    }
  }
}
