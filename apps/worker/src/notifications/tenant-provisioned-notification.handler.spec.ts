import { DomainEventBus, type InboxMessageRepository, type IntegrationEventEnvelope } from "@erp/events";
import type { RequestNotificationUseCase } from "@erp/notifications";
import {
  TENANT_PROVISIONED_NOTIFICATION_CONSUMER,
  TenantProvisionedNotificationHandler,
} from "./tenant-provisioned-notification.handler";

/** Minimal in-memory fake — only what `consumeIdempotently` needs. */
class FakeInboxMessageRepository implements InboxMessageRepository {
  private readonly claimed = new Set<string>();

  async tryClaim(options: { consumerName: string; messageId: string }): Promise<boolean> {
    const key = `${options.consumerName}:${options.messageId}`;
    if (this.claimed.has(key)) return false;
    this.claimed.add(key);
    return true;
  }

  async markProcessed(): Promise<void> {}

  async markFailed(): Promise<void> {}
}

function buildEvent(overrides: Partial<IntegrationEventEnvelope> = {}): IntegrationEventEnvelope {
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
    actor: { type: "USER", id: "user-1" },
    payload: {
      tenantId: "tenant-1",
      slug: "acme",
      name: "Acme",
      organizationId: "org-1",
      organizationCode: "HQ",
      companyId: null,
      companyCode: null,
      ownerMembershipId: "membership-1",
      ownerUserId: "user-1",
    },
    ...overrides,
  };
}

describe("TenantProvisionedNotificationHandler", () => {
  function setup() {
    const inbox = new FakeInboxMessageRepository();
    const requestNotification = { execute: jest.fn().mockResolvedValue(undefined) } as unknown as RequestNotificationUseCase;
    const bus = new DomainEventBus();
    const handler = new TenantProvisionedNotificationHandler(bus, inbox, requestNotification);
    return { inbox, requestNotification, bus, handler };
  }

  it("requests an IN_APP notification for the tenant owner from the event payload", async () => {
    const { handler, requestNotification } = setup();

    await handler.handle(buildEvent());

    expect(requestNotification.execute).toHaveBeenCalledTimes(1);
    expect(requestNotification.execute).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "tenancy.tenant_provisioned",
      title: "Tu empresa fue creada",
      body: "Acme está lista para usarse.",
      data: { tenantId: "tenant-1", tenantSlug: "acme" },
      channels: ["IN_APP"],
    });
  });

  it("produces exactly one effect when the same event is redelivered", async () => {
    const { handler, requestNotification } = setup();
    const event = buildEvent();

    await handler.handle(event);
    await handler.handle(event);

    expect(requestNotification.execute).toHaveBeenCalledTimes(1);
  });

  it("does not request a notification for a malformed payload", async () => {
    const { handler, requestNotification } = setup();

    await handler.handle(buildEvent({ payload: { unexpected: true } }));

    expect(requestNotification.execute).not.toHaveBeenCalled();
  });

  it("subscribes to tenancy.tenant.provisioned.v1 on module init", async () => {
    const { handler, bus, requestNotification } = setup();

    handler.onModuleInit();
    await bus.publish(buildEvent());

    expect(requestNotification.execute).toHaveBeenCalledTimes(1);
  });

  it("uses a stable consumer name so redelivery detection survives a process restart", async () => {
    expect(TENANT_PROVISIONED_NOTIFICATION_CONSUMER).toBe("notifications.tenant-provisioned");
  });
});
