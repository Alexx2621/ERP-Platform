import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import { NotificationNotFoundError } from "../application/errors";

export function handleNotificationsError(error: unknown): never {
  if (error instanceof NotificationNotFoundError) {
    throw new AppException("NOTIFICATION_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  throw error;
}
