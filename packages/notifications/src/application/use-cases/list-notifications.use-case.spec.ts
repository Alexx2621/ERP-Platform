import { ListNotificationsUseCase } from "./list-notifications.use-case";
import { RequestNotificationUseCase } from "./request-notification.use-case";
import { MarkNotificationReadUseCase } from "./mark-notification-read.use-case";
import { InMemoryNotificationRepository } from "../../test-support/in-memory-notification.repository";
import { InMemoryNotificationDeliveryRepository } from "../../test-support/in-memory-notification-delivery.repository";

describe("ListNotificationsUseCase", () => {
  function setup() {
    const deliveries = new InMemoryNotificationDeliveryRepository();
    const notifications = new InMemoryNotificationRepository(deliveries);
    const requestNotification = new RequestNotificationUseCase(notifications, deliveries);
    const markRead = new MarkNotificationReadUseCase(notifications, deliveries);
    const useCase = new ListNotificationsUseCase(notifications);
    return { requestNotification, markRead, useCase };
  }

  it("only returns notifications belonging to the requested tenant and recipient", async () => {
    const { requestNotification, useCase } = setup();
    await requestNotification.execute({
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "tenancy.tenant_provisioned",
      title: "For tenant-1/user-1",
      body: "body",
      channels: ["IN_APP"],
    });
    await requestNotification.execute({
      tenantId: "tenant-2",
      recipientUserId: "user-1",
      type: "tenancy.tenant_provisioned",
      title: "For tenant-2/user-1",
      body: "body",
      channels: ["IN_APP"],
    });
    await requestNotification.execute({
      tenantId: "tenant-1",
      recipientUserId: "user-2",
      type: "tenancy.tenant_provisioned",
      title: "For tenant-1/user-2",
      body: "body",
      channels: ["IN_APP"],
    });

    const result = await useCase.execute({ tenantId: "tenant-1", recipientUserId: "user-1" });

    expect(result).toHaveLength(1);
    expect(result[0]?.notification.title).toBe("For tenant-1/user-1");
  });

  it("filters to unread only when requested", async () => {
    const { requestNotification, markRead, useCase } = setup();
    const first = await requestNotification.execute({
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "t",
      title: "First",
      body: "body",
      channels: ["IN_APP"],
    });
    await requestNotification.execute({
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "t",
      title: "Second",
      body: "body",
      channels: ["IN_APP"],
    });
    await markRead.execute({
      notificationId: first.notification.id,
      tenantId: "tenant-1",
      recipientUserId: "user-1",
    });

    const result = await useCase.execute({
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      unreadOnly: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.notification.title).toBe("Second");
  });

  it("caps the limit at 200", async () => {
    const deliveries = new InMemoryNotificationDeliveryRepository();
    const notifications = new InMemoryNotificationRepository(deliveries);
    const useCase = new ListNotificationsUseCase(notifications);
    const spy = jest.spyOn(notifications, "findByRecipientWithDelivery");

    await useCase.execute({ tenantId: "tenant-1", recipientUserId: "user-1", limit: 5000 });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ limit: 200 }));
  });
});
