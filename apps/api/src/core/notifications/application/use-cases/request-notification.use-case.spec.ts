import { RequestNotificationUseCase } from "./request-notification.use-case";
import { InMemoryNotificationRepository } from "../../test-support/in-memory-notification.repository";
import { InMemoryNotificationDeliveryRepository } from "../../test-support/in-memory-notification-delivery.repository";

describe("RequestNotificationUseCase", () => {
  function setup() {
    const deliveries = new InMemoryNotificationDeliveryRepository();
    const notifications = new InMemoryNotificationRepository(deliveries);
    const useCase = new RequestNotificationUseCase(notifications, deliveries);
    return { notifications, deliveries, useCase };
  }

  it("creates a notification and a SENT delivery for an implemented channel (IN_APP)", async () => {
    const { notifications, useCase } = setup();

    const result = await useCase.execute({
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "tenancy.tenant_provisioned",
      title: "Tu empresa fue creada",
      body: "Acme está lista.",
      channels: ["IN_APP"],
    });

    expect(result.notification.recipientUserId).toBe("user-1");
    expect(result.deliveries).toHaveLength(1);
    expect(result.deliveries[0]?.channel).toBe("IN_APP");
    expect(result.deliveries[0]?.status).toBe("SENT");
    expect(result.deliveries[0]?.sentAt).not.toBeNull();
    expect(await notifications.findById(result.notification.id)).not.toBeNull();
  });

  it("creates a FAILED delivery for a channel with no adapter implemented", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "tenancy.tenant_provisioned",
      title: "Tu empresa fue creada",
      body: "Acme está lista.",
      channels: ["EMAIL"],
    });

    expect(result.deliveries).toHaveLength(1);
    expect(result.deliveries[0]?.channel).toBe("EMAIL");
    expect(result.deliveries[0]?.status).toBe("FAILED");
    expect(result.deliveries[0]?.failureReason).toContain("no adapter implemented yet");
  });

  it("creates one delivery per requested channel, mixing implemented and unimplemented", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "tenancy.tenant_provisioned",
      title: "Tu empresa fue creada",
      body: "Acme está lista.",
      channels: ["IN_APP", "EMAIL"],
    });

    expect(result.deliveries).toHaveLength(2);
    expect(result.deliveries.map((d) => d.channel).sort()).toEqual(["EMAIL", "IN_APP"]);
    expect(result.deliveries.find((d) => d.channel === "IN_APP")?.status).toBe("SENT");
    expect(result.deliveries.find((d) => d.channel === "EMAIL")?.status).toBe("FAILED");
  });

  it("carries the optional data payload through to the notification", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "tenancy.tenant_provisioned",
      title: "Tu empresa fue creada",
      body: "Acme está lista.",
      data: { tenantId: "tenant-1", tenantSlug: "acme" },
      channels: ["IN_APP"],
    });

    expect(result.notification.data).toEqual({ tenantId: "tenant-1", tenantSlug: "acme" });
  });
});
