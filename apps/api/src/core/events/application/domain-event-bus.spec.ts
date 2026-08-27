import { DomainEventBus } from "./domain-event-bus";
import type { IntegrationEventEnvelope } from "../domain/outbox-message.entity";

function buildEnvelope(overrides: Partial<IntegrationEventEnvelope> = {}): IntegrationEventEnvelope {
  return {
    eventId: "event-1",
    eventType: "tenancy.tenant.provisioned.v1",
    eventVersion: 1,
    occurredAt: new Date(),
    tenantId: "tenant-1",
    companyId: null,
    aggregateType: "Tenant",
    aggregateId: "tenant-1",
    aggregateVersion: 1,
    correlationId: "correlation-1",
    causationId: null,
    actor: null,
    payload: {},
    ...overrides,
  };
}

describe("DomainEventBus", () => {
  it("invokes every handler subscribed to a matching eventType", async () => {
    const bus = new DomainEventBus();
    const calls: string[] = [];
    bus.subscribe("tenancy.tenant.provisioned.v1", (event) => {
      calls.push(`first:${event.eventId}`);
    });
    bus.subscribe("tenancy.tenant.provisioned.v1", async (event) => {
      calls.push(`second:${event.eventId}`);
    });

    await bus.publish(buildEnvelope({ eventId: "event-42" }));

    expect(calls).toEqual(["first:event-42", "second:event-42"]);
  });

  it("does nothing (and does not throw) when no handler is registered for the eventType", async () => {
    const bus = new DomainEventBus();
    await expect(bus.publish(buildEnvelope({ eventType: "unhandled.event.v1" }))).resolves.toBeUndefined();
  });

  it("does not invoke handlers registered for a different eventType", async () => {
    const bus = new DomainEventBus();
    const handler = jest.fn();
    bus.subscribe("other.event.v1", handler);

    await bus.publish(buildEnvelope({ eventType: "tenancy.tenant.provisioned.v1" }));

    expect(handler).not.toHaveBeenCalled();
  });

  it("propagates a handler's rejection to the caller (dispatcher decides retry policy)", async () => {
    const bus = new DomainEventBus();
    bus.subscribe("tenancy.tenant.provisioned.v1", () => {
      throw new Error("handler exploded");
    });

    await expect(bus.publish(buildEnvelope())).rejects.toThrow("handler exploded");
  });
});
