import { MarkNotificationReadUseCase } from "./mark-notification-read.use-case";
import { RequestNotificationUseCase } from "./request-notification.use-case";
import { InMemoryNotificationRepository } from "../../test-support/in-memory-notification.repository";
import { InMemoryNotificationDeliveryRepository } from "../../test-support/in-memory-notification-delivery.repository";
import { NotificationNotFoundError } from "../errors";

describe("MarkNotificationReadUseCase", () => {
  function setup() {
    const deliveries = new InMemoryNotificationDeliveryRepository();
    const notifications = new InMemoryNotificationRepository(deliveries);
    const requestNotification = new RequestNotificationUseCase(notifications, deliveries);
    const useCase = new MarkNotificationReadUseCase(notifications, deliveries);
    return { requestNotification, deliveries, useCase };
  }

  it("marks the IN_APP delivery of the caller's own notification as read", async () => {
    const { requestNotification, useCase } = setup();
    const { notification } = await requestNotification.execute({
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "t",
      title: "Title",
      body: "body",
      channels: ["IN_APP"],
    });

    const delivery = await useCase.execute({
      notificationId: notification.id,
      tenantId: "tenant-1",
      recipientUserId: "user-1",
    });

    expect(delivery?.readAt).not.toBeNull();
  });

  it("throws NotificationNotFoundError for a notification that does not exist", async () => {
    const { useCase } = setup();
    await expect(
      useCase.execute({ notificationId: "missing", tenantId: "tenant-1", recipientUserId: "user-1" }),
    ).rejects.toThrow(NotificationNotFoundError);
  });

  it("throws NotificationNotFoundError for a notification belonging to a different tenant", async () => {
    const { requestNotification, useCase } = setup();
    const { notification } = await requestNotification.execute({
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "t",
      title: "Title",
      body: "body",
      channels: ["IN_APP"],
    });

    await expect(
      useCase.execute({
        notificationId: notification.id,
        tenantId: "tenant-2",
        recipientUserId: "user-1",
      }),
    ).rejects.toThrow(NotificationNotFoundError);
  });

  it("throws NotificationNotFoundError for a notification belonging to a different recipient", async () => {
    const { requestNotification, useCase } = setup();
    const { notification } = await requestNotification.execute({
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "t",
      title: "Title",
      body: "body",
      channels: ["IN_APP"],
    });

    await expect(
      useCase.execute({
        notificationId: notification.id,
        tenantId: "tenant-1",
        recipientUserId: "user-2",
      }),
    ).rejects.toThrow(NotificationNotFoundError);
  });

  it("returns null when the notification has no IN_APP delivery", async () => {
    const { requestNotification, useCase } = setup();
    const { notification } = await requestNotification.execute({
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "t",
      title: "Title",
      body: "body",
      channels: ["EMAIL"],
    });

    const delivery = await useCase.execute({
      notificationId: notification.id,
      tenantId: "tenant-1",
      recipientUserId: "user-1",
    });

    expect(delivery).toBeNull();
  });
});
