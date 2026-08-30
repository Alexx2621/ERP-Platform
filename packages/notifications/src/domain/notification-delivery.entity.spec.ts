import { NotificationDelivery } from "./notification-delivery.entity";

function sentProps() {
  return {
    id: "delivery-1",
    notificationId: "notification-1",
    channel: "IN_APP" as const,
    status: "SENT" as const,
    sentAt: new Date("2026-08-28T00:00:00.000Z"),
    readAt: null,
    failureReason: null,
    createdAt: new Date("2026-08-28T00:00:00.000Z"),
  };
}

describe("NotificationDelivery", () => {
  it("creates a SENT delivery", () => {
    const delivery = NotificationDelivery.create(sentProps());
    expect(delivery.status).toBe("SENT");
    expect(delivery.readAt).toBeNull();
  });

  it("creates a FAILED delivery with a failureReason", () => {
    const delivery = NotificationDelivery.create({
      ...sentProps(),
      status: "FAILED",
      sentAt: null,
      failureReason: "Channel EMAIL has no adapter implemented yet.",
    });
    expect(delivery.status).toBe("FAILED");
    expect(delivery.failureReason).toBe("Channel EMAIL has no adapter implemented yet.");
  });

  it("rejects a FAILED delivery with no failureReason", () => {
    expect(() =>
      NotificationDelivery.create({ ...sentProps(), status: "FAILED", failureReason: null }),
    ).toThrow("A FAILED delivery must carry a failureReason.");
  });

  it("rejects a missing notificationId", () => {
    expect(() => NotificationDelivery.create({ ...sentProps(), notificationId: "" })).toThrow(
      "NotificationDelivery notificationId is required.",
    );
  });

  it("marks a SENT delivery read", () => {
    const delivery = NotificationDelivery.create(sentProps());
    const now = new Date("2026-08-28T01:00:00.000Z");
    delivery.markRead(now);
    expect(delivery.readAt).toEqual(now);
  });

  it("is idempotent when marked read twice", () => {
    const delivery = NotificationDelivery.create(sentProps());
    const first = new Date("2026-08-28T01:00:00.000Z");
    const second = new Date("2026-08-28T02:00:00.000Z");
    delivery.markRead(first);
    delivery.markRead(second);
    expect(delivery.readAt).toEqual(first);
  });

  it("does not mark a FAILED delivery read", () => {
    const delivery = NotificationDelivery.create({
      ...sentProps(),
      status: "FAILED",
      sentAt: null,
      failureReason: "Channel EMAIL has no adapter implemented yet.",
    });
    delivery.markRead(new Date());
    expect(delivery.readAt).toBeNull();
  });

  it("round-trips through toProps", () => {
    const props = sentProps();
    const delivery = NotificationDelivery.create(props);
    expect(delivery.toProps()).toEqual(props);
  });
});
