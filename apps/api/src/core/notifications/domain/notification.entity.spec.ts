import { Notification } from "./notification.entity";

function baseProps() {
  return {
    id: "notification-1",
    tenantId: "tenant-1",
    recipientUserId: "user-1",
    type: "tenancy.tenant_provisioned",
    title: "Tu empresa fue creada",
    body: "Acme Inc. está lista para usarse.",
    data: { tenantId: "tenant-1" },
    createdAt: new Date("2026-08-28T00:00:00.000Z"),
  };
}

describe("Notification", () => {
  it("creates a valid notification", () => {
    const notification = Notification.create(baseProps());
    expect(notification.id).toBe("notification-1");
    expect(notification.type).toBe("tenancy.tenant_provisioned");
  });

  it("trims type, title and body", () => {
    const notification = Notification.create({
      ...baseProps(),
      type: "  tenancy.tenant_provisioned  ",
      title: "  Tu empresa fue creada  ",
      body: "  Acme Inc. está lista para usarse.  ",
    });
    expect(notification.type).toBe("tenancy.tenant_provisioned");
    expect(notification.title).toBe("Tu empresa fue creada");
    expect(notification.body).toBe("Acme Inc. está lista para usarse.");
  });

  it("rejects an empty type", () => {
    expect(() => Notification.create({ ...baseProps(), type: "  " })).toThrow(
      "Notification type is required.",
    );
  });

  it("rejects an empty title", () => {
    expect(() => Notification.create({ ...baseProps(), title: "  " })).toThrow(
      "Notification title is required.",
    );
  });

  it("rejects an empty body", () => {
    expect(() => Notification.create({ ...baseProps(), body: "  " })).toThrow(
      "Notification body is required.",
    );
  });

  it("rejects a missing recipientUserId", () => {
    expect(() => Notification.create({ ...baseProps(), recipientUserId: "" })).toThrow(
      "Notification recipientUserId is required.",
    );
  });

  it("accepts a null tenantId", () => {
    const notification = Notification.create({ ...baseProps(), tenantId: null });
    expect(notification.tenantId).toBeNull();
  });

  it("round-trips through toProps", () => {
    const props = baseProps();
    const notification = Notification.create(props);
    expect(notification.toProps()).toEqual(props);
  });
});
