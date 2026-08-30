export class NotificationNotFoundError extends Error {
  constructor() {
    super("The notification was not found.");
    this.name = "NotificationNotFoundError";
  }
}
