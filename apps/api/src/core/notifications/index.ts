/**
 * Public contract of the Notifications module. Other modules must only
 * import from here. Domain/application/infrastructure now live in
 * `@erp/notifications` (extracted so `apps/worker` can also request a
 * notification from its own event handlers — see
 * `apps/worker/src/notifications/tenant-provisioned-notification.handler.ts`);
 * this barrel re-exports them alongside the HTTP presentation pieces that
 * stay local to `apps/api`.
 */
export {
  Notification,
  type NotificationProps,
  NotificationDelivery,
  type NotificationDeliveryProps,
  type NotificationChannel,
  type NotificationDeliveryStatus,
  IMPLEMENTED_NOTIFICATION_CHANNELS,
  type NotificationWithDelivery,
  RequestNotificationUseCase,
  type RequestNotificationInput,
  type RequestNotificationResult,
  ListNotificationsUseCase,
  type ListNotificationsInput,
  MarkNotificationReadUseCase,
  type MarkNotificationReadInput,
  NotificationNotFoundError,
  NotificationsModule,
} from "@erp/notifications";
export {
  NotificationResponseDto,
  NotificationDeliveryResponseDto,
} from "./presentation/dto/notification-response.dto";
export { ListNotificationsDto } from "./presentation/dto/list-notifications.dto";
export { handleNotificationsError } from "./presentation/notifications-error.mapper";
