import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { newId } from "@erp/database";
import type { EnvironmentVariables } from "../../../shared/config/environment-variables";
import { DispatchOutboxBatchUseCase } from "./use-cases/dispatch-outbox-batch.use-case";

/**
 * Polls the outbox on a plain `setInterval` — deliberately not
 * `@nestjs/schedule` or BullMQ: this is a single periodic tick with no
 * cron expressions or job-queue semantics needed, so a native timer
 * managed by Nest's own lifecycle hooks is simpler than a new dependency
 * for it. Runs inside the API process for V1 (docs/WORK_QUEUE.md — a
 * dedicated `apps/worker` consuming this same outbox is a later,
 * separate backlog item, not required for Event Bus itself).
 */
@Injectable()
export class OutboxDispatcherScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcherScheduler.name);
  private readonly workerId = `api-inprocess-${newId()}`;
  private timer: NodeJS.Timeout | undefined;
  private ticking = false;

  constructor(
    private readonly dispatchOutboxBatch: DispatchOutboxBatchUseCase,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.config.get("OUTBOX_DISPATCH_INTERVAL_MS", { infer: true });
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.ticking) return; // a slow batch must not overlap with the next tick
    this.ticking = true;
    try {
      const result = await this.dispatchOutboxBatch.execute({ workerId: this.workerId });
      if (result.claimed > 0) {
        this.logger.log(
          `Outbox dispatch: claimed=${result.claimed} published=${result.published} failed=${result.failed}`,
        );
      }
    } catch (error) {
      this.logger.error(
        "Outbox dispatch tick failed",
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.ticking = false;
    }
  }
}
