import { OutboxMessage } from "../domain/outbox-message.entity";
import { ClaimOutboxBatchOptions, OutboxMessageRepository } from "../domain/outbox-message.repository";

/** Approximates the real claim query (status + lease expiry) without SELECT ... FOR UPDATE SKIP LOCKED — real locking is covered by the integration suite against Postgres. */
export class InMemoryOutboxMessageRepository implements OutboxMessageRepository {
  private readonly byId = new Map<string, OutboxMessage>();

  async claimBatch(options: ClaimOutboxBatchOptions): Promise<OutboxMessage[]> {
    const leaseExpiredBefore = new Date(options.now.getTime() - options.leaseSeconds * 1000);
    const claimable = [...this.byId.values()]
      .filter((message) => {
        const props = message.toProps();
        if (props.status === "PENDING" && props.availableAt <= options.now) return true;
        if (props.status === "PROCESSING" && props.lockedAt && props.lockedAt < leaseExpiredBefore) return true;
        return false;
      })
      .sort((a, b) => a.toProps().availableAt.getTime() - b.toProps().availableAt.getTime())
      .slice(0, options.limit);

    for (const message of claimable) {
      message.markProcessing(options.lockedBy, options.now);
      this.byId.set(message.id, message);
    }
    return claimable;
  }

  async save(message: OutboxMessage): Promise<void> {
    this.byId.set(message.id, message);
  }

  async deletePublishedBefore(cutoff: Date, limit: number): Promise<number> {
    const candidates = [...this.byId.values()]
      .filter((message) => {
        const props = message.toProps();
        return props.status === "PUBLISHED" && !!props.publishedAt && props.publishedAt < cutoff;
      })
      .slice(0, limit);
    for (const message of candidates) {
      this.byId.delete(message.id);
    }
    return candidates.length;
  }

  /** Test-only helper: insert a message directly, bypassing appendOutboxMessage's transactional-write concern. */
  seed(message: OutboxMessage): void {
    this.byId.set(message.id, message);
  }

  all(): OutboxMessage[] {
    return [...this.byId.values()];
  }
}
