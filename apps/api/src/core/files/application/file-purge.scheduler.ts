import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnvironmentVariables } from "../../../shared/config/environment-variables";
import { PurgeDeletedFilesUseCase } from "./use-cases/purge-deleted-files.use-case";

/**
 * Polls on a plain `setInterval`, same shape and reasoning as
 * `OutboxDispatcherScheduler` (`@erp/events`) — a single periodic tick with
 * no cron semantics needed. Runs inside `apps/api` for V1, not `apps/worker`:
 * this is the exact same evolutionary starting point the outbox dispatcher
 * itself once had (ADR-004's original design, before its own extraction) —
 * extract later if this ever needs independent scaling, not before.
 */
@Injectable()
export class FilePurgeScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FilePurgeScheduler.name);
  private timer: NodeJS.Timeout | undefined;
  private ticking = false;

  constructor(
    private readonly purgeDeletedFiles: PurgeDeletedFilesUseCase,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.config.get("FILES_PURGE_INTERVAL_MS", { infer: true });
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.timer.unref();
    this.logger.log(
      `File purge scheduler started (intervalMs=${intervalMs}, retentionDays=${this.config.get("FILES_PURGE_RETENTION_DAYS", { infer: true })})`,
    );
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const result = await this.purgeDeletedFiles.execute({
        retentionDays: this.config.get("FILES_PURGE_RETENTION_DAYS", { infer: true }),
        batchSize: this.config.get("FILES_PURGE_BATCH_SIZE", { infer: true }),
      });
      if (result.purged > 0 || result.failed > 0) {
        this.logger.log(`File purge: purged=${result.purged} failed=${result.failed}`);
      }
    } catch (error) {
      this.logger.error("File purge tick failed", error instanceof Error ? error.stack : String(error));
    } finally {
      this.ticking = false;
    }
  }
}
