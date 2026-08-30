import { Module } from "@nestjs/common";
import { NOTIFICATION_REPOSITORY } from "./domain/notification.repository";
import { NOTIFICATION_DELIVERY_REPOSITORY } from "./domain/notification-delivery.repository";
import { PrismaNotificationRepository } from "./infrastructure/prisma-notification.repository";
import { PrismaNotificationDeliveryRepository } from "./infrastructure/prisma-notification-delivery.repository";
import { RequestNotificationUseCase } from "./application/use-cases/request-notification.use-case";
import { ListNotificationsUseCase } from "./application/use-cases/list-notifications.use-case";
import { MarkNotificationReadUseCase } from "./application/use-cases/mark-notification-read.use-case";

/**
 * Lives in `@erp/notifications` (extracted from `apps/api/src/core/notifications`,
 * same reasoning and pattern as the `@erp/events` extraction — docs/DECISIONS.md
 * ADR-004's amendment) so both `apps/api` (HTTP read endpoints, direct
 * application calls) and `apps/worker` (the `tenancy.tenant.provisioned.v1`
 * event handler) can import it without any business module living outside
 * a single app. Deliberately has ZERO dependency on any other module.
 *
 * The consuming app must provide `PRISMA_CLIENT` (see
 * `infrastructure/prisma-client.token`) somewhere globally reachable in its
 * own module graph, same pattern `@erp/events` already established.
 *
 * There is no controller here — HTTP concerns (`GET /api/v1/notifications`,
 * `PUT /api/v1/notifications/:id/read`) stay in `apps/api`, registered by
 * `TenantsModule` for the same reason as RolesController/AuditEntriesController:
 * see `apps/api/src/core/tenants/presentation/notifications.controller.ts`.
 */
@Module({
  providers: [
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
    { provide: NOTIFICATION_DELIVERY_REPOSITORY, useClass: PrismaNotificationDeliveryRepository },
    RequestNotificationUseCase,
    ListNotificationsUseCase,
    MarkNotificationReadUseCase,
  ],
  exports: [RequestNotificationUseCase, ListNotificationsUseCase, MarkNotificationReadUseCase],
})
export class NotificationsModule {}
