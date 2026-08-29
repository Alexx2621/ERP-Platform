import { InboxMessage } from "./inbox-message.entity";

const base = {
  id: "inbox-1",
  consumerName: "notifications",
  messageId: "event-1",
  tenantId: "tenant-1",
  status: "PROCESSING" as const,
  attemptCount: 0,
  lastErrorCode: null,
  lockedAt: new Date("2026-08-29T10:00:00.000Z"),
  processedAt: null,
  createdAt: new Date("2026-08-29T10:00:00.000Z"),
};

describe("InboxMessage", () => {
  it("creates a valid message", () => {
    const message = InboxMessage.create(base);
    expect(message.consumerName).toBe("notifications");
    expect(message.messageId).toBe("event-1");
    expect(message.status).toBe("PROCESSING");
  });

  it("rejects an empty consumerName", () => {
    expect(() => InboxMessage.create({ ...base, consumerName: "  " })).toThrow();
  });

  it("rejects a missing messageId", () => {
    expect(() => InboxMessage.create({ ...base, messageId: "" })).toThrow();
  });
});
