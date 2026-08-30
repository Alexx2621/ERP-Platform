/** Public contract of the Notifications package. Consuming apps must only import from here (or from `./infrastructure/prisma-client.token` to satisfy the module's DI requirement). */
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
  EMAIL_DISPATCHER,
  type EmailDispatcherPort,
  type SendEmailInput,
} from "./application/ports/email-dispatcher.port";
export { SmtpEmailDispatcher, type SmtpConfig } from "./infrastructure/smtp-email-dispatcher";
export {
  ListNotificationsUseCase,
  type ListNotificationsInput,
} from "./application/use-cases/list-notifications.use-case";
export {
  MarkNotificationReadUseCase,
  type MarkNotificationReadInput,
} from "./application/use-cases/mark-notification-read.use-case";
export { NotificationNotFoundError } from "./application/errors";
export { NotificationsModule } from "./notifications.module";
export { PRISMA_CLIENT } from "./infrastructure/prisma-client.token";
export { PrismaNotificationRepository } from "./infrastructure/prisma-notification.repository";
export { PrismaNotificationDeliveryRepository } from "./infrastructure/prisma-notification-delivery.repository";
