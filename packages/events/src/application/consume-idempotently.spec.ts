import { InMemoryInboxMessageRepository } from "../test-support/in-memory-inbox-message.repository";
import { consumeIdempotently } from "./consume-idempotently";

const now = new Date("2026-08-29T10:00:00.000Z");

describe("consumeIdempotently", () => {
  it("runs the effect exactly once for a message seen for the first time", async () => {
    const inbox = new InMemoryInboxMessageRepository();
    const effect = jest.fn().mockResolvedValue(undefined);

    const outcome = await consumeIdempotently(
      inbox,
      { consumerName: "notifications", messageId: "event-1", tenantId: "tenant-1", now },
      effect,
    );

    expect(outcome).toBe("processed");
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it("a redelivered (duplicate) message produces exactly one effect, not two", async () => {
    const inbox = new InMemoryInboxMessageRepository();
    const effect = jest.fn().mockResolvedValue(undefined);
    const input = { consumerName: "notifications", messageId: "event-1", tenantId: "tenant-1", now };

    await consumeIdempotently(inbox, input, effect);
    const secondOutcome = await consumeIdempotently(inbox, input, effect);

    expect(secondOutcome).toBe("duplicate");
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it("two concurrent claimants for the same never-seen message never both run the effect", async () => {
    const inbox = new InMemoryInboxMessageRepository();
    const effect = jest.fn().mockResolvedValue(undefined);
    const input = { consumerName: "notifications", messageId: "event-1", tenantId: "tenant-1", now };

    const [first, second] = await Promise.all([
      consumeIdempotently(inbox, input, effect),
      consumeIdempotently(inbox, input, effect),
    ]);

    const outcomes = [first, second].sort();
    expect(outcomes).toEqual(["duplicate", "processed"]);
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it("records failure without throwing, and leaves the message reclaimable", async () => {
    const inbox = new InMemoryInboxMessageRepository();
    const effect = jest.fn().mockRejectedValue(new Error("smtp unavailable"));
    const input = { consumerName: "notifications", messageId: "event-1", tenantId: "tenant-1", now };

    const outcome = await consumeIdempotently(inbox, input, effect);
    expect(outcome).toBe("failed");

    // Immediately retrying within the lease window is still a duplicate —
    // another worker (or the same one) must not hammer a failing effect.
    const immediateRetry = await consumeIdempotently(inbox, input, effect);
    expect(immediateRetry).toBe("duplicate");
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it("recovers a message whose lease expired without a separate worker crashing", async () => {
    const inbox = new InMemoryInboxMessageRepository();
    const effect = jest.fn().mockResolvedValue(undefined);
    const staleClaimTime = new Date(now.getTime() - 120_000);

    // Simulate a claim that never completed (crash) 2 minutes ago.
    await inbox.tryClaim({
      consumerName: "notifications",
      messageId: "event-1",
      tenantId: "tenant-1",
      now: staleClaimTime,
      leaseSeconds: 300,
    });

    const tooSoon = await consumeIdempotently(
      inbox,
      { consumerName: "notifications", messageId: "event-1", tenantId: "tenant-1", now, leaseSeconds: 300 },
      effect,
    );
    expect(tooSoon).toBe("duplicate");

    const recovered = await consumeIdempotently(
      inbox,
      { consumerName: "notifications", messageId: "event-1", tenantId: "tenant-1", now, leaseSeconds: 60 },
      effect,
    );
    expect(recovered).toBe("processed");
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it("different consumers processing the same message id are independent", async () => {
    const inbox = new InMemoryInboxMessageRepository();
    const notificationsEffect = jest.fn().mockResolvedValue(undefined);
    const otherEffect = jest.fn().mockResolvedValue(undefined);

    await consumeIdempotently(
      inbox,
      { consumerName: "notifications", messageId: "event-1", tenantId: "tenant-1", now },
      notificationsEffect,
    );
    const otherOutcome = await consumeIdempotently(
      inbox,
      { consumerName: "some-other-consumer", messageId: "event-1", tenantId: "tenant-1", now },
      otherEffect,
    );

    expect(otherOutcome).toBe("processed");
    expect(notificationsEffect).toHaveBeenCalledTimes(1);
    expect(otherEffect).toHaveBeenCalledTimes(1);
  });
});
