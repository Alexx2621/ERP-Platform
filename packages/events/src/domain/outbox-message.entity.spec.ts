import { OutboxMessage } from "./outbox-message.entity";

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
  occurredAt: new Date("2026-08-27T10:00:00.000Z"),
  availableAt: new Date("2026-08-27T10:00:00.000Z"),
  status: "PENDING" as const,
  attemptCount: 0,
  lastErrorCode: null,
  lockedAt: null,
  lockedBy: null,
  publishedAt: null,
  correlationId: "correlation-1",
  causationId: null,
  actorType: "USER" as const,
  actorId: "user-1",
  traceParent: null,
  traceState: null,
  createdAt: new Date("2026-08-27T10:00:00.000Z"),
};

describe("OutboxMessage", () => {
  it("creates a valid message", () => {
    const message = OutboxMessage.create(base);
    expect(message.eventType).toBe("tenancy.tenant.provisioned.v1");
    expect(message.status).toBe("PENDING");
  });

  it("rejects an empty eventType or aggregateType", () => {
    expect(() => OutboxMessage.create({ ...base, eventType: "  " })).toThrow();
    expect(() => OutboxMessage.create({ ...base, aggregateType: " " })).toThrow();
  });

  it("rejects a companyId without a tenantId", () => {
    expect(() => OutboxMessage.create({ ...base, tenantId: null, companyId: "company-1" })).toThrow();
  });

  it("reconstitutes the full integration event envelope", () => {
    const message = OutboxMessage.create(base);
    expect(message.toEnvelope()).toEqual({
      eventId: "msg-1",
      eventType: "tenancy.tenant.provisioned.v1",
      eventVersion: 1,
      occurredAt: base.occurredAt,
      tenantId: "tenant-1",
      companyId: null,
      aggregateType: "Tenant",
      aggregateId: "tenant-1",
      aggregateVersion: 1,
      correlationId: "correlation-1",
      causationId: null,
      actor: { type: "USER", id: "user-1" },
      payload: { slug: "acme" },
    });
  });

  it("envelope actor is null when neither actorType nor actorId is set (system-initiated with no context)", () => {
    const message = OutboxMessage.create({ ...base, actorType: null, actorId: null });
    expect(message.toEnvelope().actor).toBeNull();
  });

  it("markProcessing sets status/lock, markPublished clears the lock", () => {
    const message = OutboxMessage.create(base);
    const now = new Date("2026-08-27T10:01:00.000Z");
    message.markProcessing("worker-1", now);
    expect(message.status).toBe("PROCESSING");
    message.markPublished(new Date("2026-08-27T10:01:05.000Z"));
    expect(message.status).toBe("PUBLISHED");
    expect(message.toProps().lockedBy).toBeNull();
    expect(message.toProps().publishedAt).not.toBeNull();
  });

  it("markFailed retries with backoff until maxAttempts, then dead-letters to FAILED", () => {
    const message = OutboxMessage.create(base);
    const now = new Date("2026-08-27T10:01:00.000Z");

    message.markFailed(now, "boom", 3);
    expect(message.status).toBe("PENDING");
    expect(message.attemptCount).toBe(1);
    expect(message.toProps().availableAt.getTime()).toBeGreaterThan(now.getTime());

    message.markFailed(now, "boom", 3);
    expect(message.status).toBe("PENDING");
    expect(message.attemptCount).toBe(2);

    message.markFailed(now, "boom", 3);
    expect(message.status).toBe("FAILED");
    expect(message.attemptCount).toBe(3);
  });
});
