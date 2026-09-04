import { OutboxMessage } from "../../domain/outbox-message.entity";
import { InMemoryOutboxMessageRepository } from "../../test-support/in-memory-outbox-message.repository";
import { PurgePublishedOutboxMessagesUseCase } from "./purge-published-outbox-messages.use-case";

const base = {
  id: "msg-1",
  tenantId: "tenant-1",
  companyId: null,
  eventType: "tenancy.tenant.provisioned.v1",
  eventVersion: 1,
  aggregateType: "Tenant",
  aggregateId: "tenant-1",
  aggregateVersion: 1,
  payload: { slug: "acme" },
  occurredAt: new Date("2026-08-01T00:00:00.000Z"),
  availableAt: new Date("2026-08-01T00:00:00.000Z"),
  attemptCount: 0,
  lastErrorCode: null,
  lockedAt: null,
  lockedBy: null,
  correlationId: "correlation-1",
  causationId: null,
  actorType: "USER" as const,
  actorId: "user-1",
  traceParent: null,
  traceState: null,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
};

function publishedAt(id: string, publishedAt: Date): OutboxMessage {
  return OutboxMessage.create({ ...base, id, status: "PUBLISHED", publishedAt });
}

describe("PurgePublishedOutboxMessagesUseCase", () => {
  const now = new Date("2026-09-04T00:00:00.000Z");

  it("purges a PUBLISHED message well past the retention window", async () => {
    const outbox = new InMemoryOutboxMessageRepository();
    outbox.seed(publishedAt("msg-old", new Date("2026-07-01T00:00:00.000Z")));
    const useCase = new PurgePublishedOutboxMessagesUseCase(outbox);

    const result = await useCase.execute({ retentionDays: 30, batchSize: 10, now });

    expect(result).toEqual({ purged: 1 });
    expect(outbox.all()).toHaveLength(0);
  });

  it("leaves a PUBLISHED message within the retention window untouched", async () => {
    const outbox = new InMemoryOutboxMessageRepository();
    outbox.seed(publishedAt("msg-recent", new Date("2026-09-01T00:00:00.000Z")));
    const useCase = new PurgePublishedOutboxMessagesUseCase(outbox);

    const result = await useCase.execute({ retentionDays: 30, batchSize: 10, now });

    expect(result).toEqual({ purged: 0 });
    expect(outbox.all()).toHaveLength(1);
  });

  it("never touches a FAILED (dead-letter) message, no matter how old", async () => {
    const outbox = new InMemoryOutboxMessageRepository();
    const failed = OutboxMessage.create({
      ...base,
      id: "msg-failed",
      status: "FAILED",
      publishedAt: null,
      lastErrorCode: "Error: downstream unavailable",
      attemptCount: 5,
    });
    outbox.seed(failed);
    const useCase = new PurgePublishedOutboxMessagesUseCase(outbox);

    const result = await useCase.execute({ retentionDays: 1, batchSize: 10, now });

    expect(result).toEqual({ purged: 0 });
    expect(outbox.all()).toHaveLength(1);
  });

  it("never touches a PENDING message", async () => {
    const outbox = new InMemoryOutboxMessageRepository();
    outbox.seed(OutboxMessage.create({ ...base, id: "msg-pending", status: "PENDING", publishedAt: null }));
    const useCase = new PurgePublishedOutboxMessagesUseCase(outbox);

    const result = await useCase.execute({ retentionDays: 1, batchSize: 10, now });

    expect(result).toEqual({ purged: 0 });
    expect(outbox.all()).toHaveLength(1);
  });

  it("respects the batch size limit", async () => {
    const outbox = new InMemoryOutboxMessageRepository();
    for (let i = 0; i < 5; i += 1) {
      outbox.seed(publishedAt(`msg-${i}`, new Date("2026-07-01T00:00:00.000Z")));
    }
    const useCase = new PurgePublishedOutboxMessagesUseCase(outbox);

    const result = await useCase.execute({ retentionDays: 30, batchSize: 2, now });

    expect(result).toEqual({ purged: 2 });
    expect(outbox.all()).toHaveLength(3);
  });
});
