import { appendOutboxMessage, PrismaClientLike } from "./append-outbox-message";

function buildFakeClient() {
  const create = jest.fn().mockResolvedValue(undefined);
  const client = { outboxMessage: { create } } as unknown as PrismaClientLike;
  return { client, create };
}

describe("appendOutboxMessage", () => {
  it("inserts a PENDING row with a fresh id and returns the domain entity", async () => {
    const { client, create } = buildFakeClient();

    const message = await appendOutboxMessage(client, {
      tenantId: "tenant-1",
      companyId: null,
      eventType: "tenancy.tenant.provisioned.v1",
      eventVersion: 1,
      aggregateType: "Tenant",
      aggregateId: "tenant-1",
      aggregateVersion: 1,
      payload: { slug: "acme" },
      correlationId: "correlation-1",
      actor: { type: "USER", id: "user-1" },
    });

    expect(message.status).toBe("PENDING");
    expect(message.eventType).toBe("tenancy.tenant.provisioned.v1");
    expect(create).toHaveBeenCalledTimes(1);
    const inserted = create.mock.calls[0][0].data;
    expect(inserted.id).toBe(message.id);
    expect(inserted.status).toBe("PENDING");
    expect(inserted.attemptCount).toBe(0);
    expect(inserted.correlationId).toBe("correlation-1");
    expect(inserted.actorType).toBe("USER");
    expect(inserted.actorId).toBe("user-1");
  });

  it("defaults optional fields to null and generates a distinct id per call", async () => {
    const { client } = buildFakeClient();

    const first = await appendOutboxMessage(client, {
      tenantId: null,
      eventType: "tenancy.tenant.provisioned.v1",
      eventVersion: 1,
      aggregateType: "Tenant",
      aggregateId: "tenant-1",
      payload: {},
      correlationId: "correlation-1",
      actor: null,
    });
    const second = await appendOutboxMessage(client, {
      tenantId: null,
      eventType: "tenancy.tenant.provisioned.v1",
      eventVersion: 1,
      aggregateType: "Tenant",
      aggregateId: "tenant-1",
      payload: {},
      correlationId: "correlation-1",
      actor: null,
    });

    expect(first.id).not.toBe(second.id);
    expect(first.toProps().companyId).toBeNull();
    expect(first.toProps().actorType).toBeNull();
    expect(first.toProps().causationId).toBeNull();
  });

  it("rejects a companyId without a tenantId, without ever calling the client", async () => {
    const { client, create } = buildFakeClient();

    await expect(
      appendOutboxMessage(client, {
        tenantId: null,
        companyId: "company-1",
        eventType: "tenancy.tenant.provisioned.v1",
        eventVersion: 1,
        aggregateType: "Tenant",
        aggregateId: "tenant-1",
        payload: {},
        correlationId: "correlation-1",
        actor: null,
      }),
    ).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
});
