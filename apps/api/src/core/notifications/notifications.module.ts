import { Module } from "@nestjs/common";
import { NOTIFICATION_REPOSITORY } from "./domain/notification.repository";
import { NOTIFICATION_DELIVERY_REPOSITORY } from "./domain/notification-delivery.repository";
import { PrismaNotificationRepository } from "./infrastructure/prisma-notification.repository";
import { PrismaNotificationDeliveryRepository } from "./infrastructure/prisma-notification-delivery.repository";
import { RequestNotificationUseCase } from "./application/use-cases/request-notification.use-case";
import { ListNotificationsUseCase } from "./application/use-cases/list-notifications.use-case";
import { MarkNotificationReadUseCase } from "./application/use-cases/mark-notification-read.use-case";

/**
 * Deliberately has ZERO dependency on any other core module — same "leaf"
 * shape as AccessControlModule/AuditModule/EventsModule. Any module that
 * wants to request a notification (Tenants at provisioning today; future
 * business modules later) imports NotificationsModule directly; since
 * Notifications never imports anything back, none of those imports can
 * create a cycle.
 *
 * There is no controller here. The read endpoints (GET /api/v1/notifications,
 * PUT /api/v1/notifications/:id/read) need SessionAuthGuard + TenantContextGuard,
 * so — same reasoning as RolesController/AuditEntriesController — they are
 * registered by TenantsModule instead: see
 * tenants/presentation/notifications.controller.ts.
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
