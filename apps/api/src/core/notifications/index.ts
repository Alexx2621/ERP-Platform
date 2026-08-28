/** Public contract of the Notifications module. Other modules must only import from here. */
export { Notification, type NotificationProps } from "./domain/notification.entity";
export {
  NotificationDelivery,
  type NotificationDeliveryProps,
  type NotificationChannel,
  type NotificationDeliveryStatus,
  IMPLEMENTED_NOTIFICATION_CHANNELS,
} from "./domain/notification-delivery.entity";
export type { NotificationWithDelivery } from "./domain/notification.repository";
export {
  RequestNotificationUseCase,
  type RequestNotificationInput,
  type RequestNotificationResult,
} from "./application/use-cases/request-notification.use-case";
export {
  ListNotificationsUseCase,
  type ListNotificationsInput,
} from "./application/use-cases/list-notifications.use-case";
export {
  MarkNotificationReadUseCase,
  type MarkNotificationReadInput,
} from "./application/use-cases/mark-notification-read.use-case";
export { NotificationNotFoundError } from "./application/errors";
export {
  NotificationResponseDto,
  NotificationDeliveryResponseDto,
} from "./presentation/dto/notification-response.dto";
export { ListNotificationsDto } from "./presentation/dto/list-notifications.dto";
export { handleNotificationsError } from "./presentation/notifications-error.mapper";
export { NotificationsModule } from "./notifications.module";
