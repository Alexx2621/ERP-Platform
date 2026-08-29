import { ClaimInboxMessageOptions, InboxMessageRepository } from "../domain/inbox-message.repository";

interface Row {
  status: "PROCESSING" | "PROCESSED";
  attemptCount: number;
  lastErrorCode: string | null;
  lockedAt: Date;
}

export class InMemoryInboxMessageRepository implements InboxMessageRepository {
  private readonly rows = new Map<string, Row>();

  private key(consumerName: string, messageId: string): string {
    return `${consumerName}::${messageId}`;
  }

  async tryClaim(options: ClaimInboxMessageOptions): Promise<boolean> {
    const key = this.key(options.consumerName, options.messageId);
    const leaseExpiredBefore = new Date(options.now.getTime() - options.leaseSeconds * 1000);
    const existing = this.rows.get(key);

    if (!existing) {
      this.rows.set(key, {
        status: "PROCESSING",
        attemptCount: 0,
        lastErrorCode: null,
        lockedAt: options.now,
      });
      return true;
    }

    if (existing.status === "PROCESSED") return false;
    if (existing.lockedAt >= leaseExpiredBefore) return false;

    existing.lockedAt = options.now;
    existing.attemptCount += 1;
    return true;
  }

  async markProcessed(consumerName: string, messageId: string, _now: Date): Promise<void> {
    const row = this.rows.get(this.key(consumerName, messageId));
    if (row) {
      row.status = "PROCESSED";
    }
  }

  async markFailed(consumerName: string, messageId: string, _now: Date, errorCode: string): Promise<void> {
    const row = this.rows.get(this.key(consumerName, messageId));
    if (row) {
      row.lastErrorCode = errorCode.slice(0, 150);
    }
  }
}
