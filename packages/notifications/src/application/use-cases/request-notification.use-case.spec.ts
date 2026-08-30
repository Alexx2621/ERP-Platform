import type { EmailDispatcherPort, SendEmailInput } from "../ports/email-dispatcher.port";
import { RequestNotificationUseCase } from "./request-notification.use-case";
import { InMemoryNotificationRepository } from "../../test-support/in-memory-notification.repository";
import { InMemoryNotificationDeliveryRepository } from "../../test-support/in-memory-notification-delivery.repository";

class FakeEmailDispatcher implements EmailDispatcherPort {
  readonly sent: SendEmailInput[] = [];
  private failWith: Error | undefined;

  async send(input: SendEmailInput): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.sent.push(input);
  }

  failNextSendWith(error: Error): void {
    this.failWith = error;
  }
}

describe("RequestNotificationUseCase", () => {
  function setup(emailDispatcher?: EmailDispatcherPort) {
    const deliveries = new InMemoryNotificationDeliveryRepository();
    const notifications = new InMemoryNotificationRepository(deliveries);
    const useCase = new RequestNotificationUseCase(notifications, deliveries, emailDispatcher);
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

  it("creates a FAILED delivery for a channel with no adapter implemented at all", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "tenancy.tenant_provisioned",
      title: "Tu empresa fue creada",
      body: "Acme está lista.",
      channels: ["SMS"],
    });

    expect(result.deliveries).toHaveLength(1);
    expect(result.deliveries[0]?.channel).toBe("SMS");
    expect(result.deliveries[0]?.status).toBe("FAILED");
    expect(result.deliveries[0]?.failureReason).toContain("no adapter implemented yet");
  });

  it("creates one delivery per requested channel, mixing a working and a missing adapter", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      tenantId: "tenant-1",
      recipientUserId: "user-1",
      type: "tenancy.tenant_provisioned",
      title: "Tu empresa fue creada",
      body: "Acme está lista.",
      channels: ["IN_APP", "SMS"],
    });

    expect(result.deliveries).toHaveLength(2);
    expect(result.deliveries.map((d) => d.channel).sort()).toEqual(["IN_APP", "SMS"]);
    expect(result.deliveries.find((d) => d.channel === "IN_APP")?.status).toBe("SENT");
    expect(result.deliveries.find((d) => d.channel === "SMS")?.status).toBe("FAILED");
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

  describe("EMAIL channel", () => {
    it("fails with an explanatory reason when no EmailDispatcherPort is configured", async () => {
      const { useCase } = setup(undefined);

      const result = await useCase.execute({
        tenantId: "tenant-1",
        recipientUserId: "user-1",
        type: "tenancy.membership_invited",
        title: "Fuiste invitado",
        body: "Revisa tus invitaciones.",
        recipientEmail: "invitee@example.com",
        channels: ["EMAIL"],
      });

      expect(result.deliveries[0]?.status).toBe("FAILED");
      expect(result.deliveries[0]?.failureReason).toBe("No email adapter configured.");
    });

    it("fails with an explanatory reason when no recipientEmail was provided, even with a dispatcher configured", async () => {
      const dispatcher = new FakeEmailDispatcher();
      const { useCase } = setup(dispatcher);

      const result = await useCase.execute({
        tenantId: "tenant-1",
        recipientUserId: "user-1",
        type: "tenancy.membership_invited",
        title: "Fuiste invitado",
        body: "Revisa tus invitaciones.",
        channels: ["EMAIL"],
      });

      expect(result.deliveries[0]?.status).toBe("FAILED");
      expect(result.deliveries[0]?.failureReason).toBe("No recipient email address was provided.");
      expect(dispatcher.sent).toHaveLength(0);
    });

    it("dispatches a real SENT delivery when a dispatcher and recipientEmail are both present", async () => {
      const dispatcher = new FakeEmailDispatcher();
      const { useCase } = setup(dispatcher);

      const result = await useCase.execute({
        tenantId: "tenant-1",
        recipientUserId: "user-1",
        type: "tenancy.membership_invited",
        title: "Fuiste invitado",
        body: "Revisa tus invitaciones.",
        recipientEmail: "invitee@example.com",
        channels: ["EMAIL"],
      });

      expect(result.deliveries[0]?.status).toBe("SENT");
      expect(result.deliveries[0]?.failureReason).toBeNull();
      expect(dispatcher.sent).toEqual([
        { to: "invitee@example.com", subject: "Fuiste invitado", body: "Revisa tus invitaciones." },
      ]);
    });

    it("marks the delivery FAILED with the dispatcher's own error message when sending throws", async () => {
      const dispatcher = new FakeEmailDispatcher();
      dispatcher.failNextSendWith(new Error("SMTP connection refused"));
      const { useCase } = setup(dispatcher);

      const result = await useCase.execute({
        tenantId: "tenant-1",
        recipientUserId: "user-1",
        type: "tenancy.membership_invited",
        title: "Fuiste invitado",
        body: "Revisa tus invitaciones.",
        recipientEmail: "invitee@example.com",
        channels: ["EMAIL"],
      });

      expect(result.deliveries[0]?.status).toBe("FAILED");
      expect(result.deliveries[0]?.failureReason).toBe("SMTP connection refused");
    });
  });
});
