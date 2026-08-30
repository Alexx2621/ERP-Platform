import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import {
  consumeIdempotently,
  DomainEventBus,
  INBOX_MESSAGE_REPOSITORY,
  type InboxMessageRepository,
  type IntegrationEventEnvelope,
} from "@erp/events";
import { RequestNotificationUseCase } from "@erp/notifications";

/** Matches the payload `PrismaTenantProvisioningRepository.create()` appends to the outbox (apps/api). */
interface TenantProvisionedPayload {
  tenantId: string;
  slug: string;
  name: string;
  ownerUserId: string;
}

function isTenantProvisionedPayload(payload: unknown): payload is TenantProvisionedPayload {
  if (typeof payload !== "object" || payload === null) return false;
  const candidate = payload as Record<string, unknown>;
  return (
    typeof candidate.tenantId === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.ownerUserId === "string"
  );
}

export const TENANT_PROVISIONED_NOTIFICATION_CONSUMER = "notifications.tenant-provisioned";

/**
 * The first real cross-process DomainEventBus consumer (docs/DECISIONS.md
 * ADR-004 point 5 / ADR-008 "Deferred", docs/WORK_QUEUE.md item 1). Replaces
 * the direct `RequestNotificationUseCase` call that used to live inline in
 * `TenantsController.provision()` (apps/api) — that controller no longer
 * knows Notifications exists at all; the owner notification is now a pure
 * side effect of `tenancy.tenant.provisioned.v1` being published.
 *
 * Registered via `onModuleInit` (same lifecycle hook `OutboxDispatcherScheduler`
 * already uses to start its own timer) rather than a constructor side effect,
 * so subscription happens exactly once when the worker process boots, not on
 * every DI resolution.
 */
@Injectable()
export class TenantProvisionedNotificationHandler implements OnModuleInit {
  private readonly logger = new Logger(TenantProvisionedNotificationHandler.name);

  constructor(
    private readonly eventBus: DomainEventBus,
    @Inject(INBOX_MESSAGE_REPOSITORY) private readonly inbox: InboxMessageRepository,
    private readonly requestNotification: RequestNotificationUseCase,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe("tenancy.tenant.provisioned.v1", (event) => this.handle(event));
  }

  async handle(event: IntegrationEventEnvelope): Promise<void> {
    if (!isTenantProvisionedPayload(event.payload)) {
      this.logger.error(
        `Malformed tenancy.tenant.provisioned.v1 payload — skipping (eventId=${event.eventId})`,
      );
      return;
    }
    const payload = event.payload;

    const outcome = await consumeIdempotently(
      this.inbox,
      {
        consumerName: TENANT_PROVISIONED_NOTIFICATION_CONSUMER,
        messageId: event.eventId,
        tenantId: event.tenantId,
        now: new Date(),
      },
      async () => {
        await this.requestNotification.execute({
          tenantId: payload.tenantId,
          recipientUserId: payload.ownerUserId,
          type: "tenancy.tenant_provisioned",
          title: "Tu empresa fue creada",
          body: `${payload.name} está lista para usarse.`,
          data: { tenantId: payload.tenantId, tenantSlug: payload.slug },
          channels: ["IN_APP"],
        });
      },
    );

    if (outcome === "failed") {
      this.logger.warn(
        `Failed to request the tenant-provisioned notification (eventId=${event.eventId}) — ` +
          "will retry once the outbox row is redelivered.",
      );
    }
  }
}
