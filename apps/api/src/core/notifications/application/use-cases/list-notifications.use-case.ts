import { Inject, Injectable } from "@nestjs/common";
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepository,
  NotificationWithDelivery,
} from "../../domain/notification.repository";

export interface ListNotificationsInput {
  tenantId: string;
  recipientUserId: string;
  unreadOnly?: boolean;
  limit?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

@Injectable()
export class ListNotificationsUseCase {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository) {}

  execute(input: ListNotificationsInput): Promise<NotificationWithDelivery[]> {
    const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    return this.notifications.findByRecipientWithDelivery({
      tenantId: input.tenantId,
      recipientUserId: input.recipientUserId,
      unreadOnly: input.unreadOnly ?? false,
      limit,
    });
  }
}
