import { InMemoryOutboxMessageRepository } from "../../test-support/in-memory-outbox-message.repository";
import { appendOutboxMessage, PrismaClientLike } from "../append-outbox-message";
import { DomainEventBus } from "../domain-event-bus";
import { OutboxMessage } from "../../domain/outbox-message.entity";
import { DispatchOutboxBatchUseCase } from "./dispatch-outbox-batch.use-case";

function fakeInsertingClient(outbox: InMemoryOutboxMessageRepository): PrismaClientLike {
  return {
    outboxMessage: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        // appendOutboxMessage already built the domain entity correctly;
        // this just needs to land it in the in-memory store the same way
        // the real Prisma repository's toDomain() would reconstruct it.
        outbox.seed(
          OutboxMessage.create({
            id: data.id as string,
            tenantId: data.tenantId as string | null,
            companyId: data.companyId as string | null,
            eventType: data.eventType as string,
            eventVersion: data.eventVersion as number,
            aggregateType: data.aggregateType as string,
            aggregateId: data.aggregateId as string,
            aggregateVersion: data.aggregateVersion as number | null,
            payload: data.payload,
            occurredAt: data.occurredAt as Date,
            availableAt: data.availableAt as Date,
            status: "PENDING",
            attemptCount: 0,
            lastErrorCode: null,
            lockedAt: null,
            lockedBy: null,
            publishedAt: null,
            correlationId: data.correlationId as string,
            causationId: data.causationId as string | null,
            actorType: data.actorType as "USER" | "SYSTEM" | null,
            actorId: data.actorId as string | null,
            createdAt: data.createdAt as Date,
          }),
        );
      }),
    },
  } as unknown as PrismaClientLike;
}

describe("DispatchOutboxBatchUseCase", () => {
  it("publishes a claimed message to the DomainEventBus and marks it PUBLISHED", async () => {
    const outbox = new InMemoryOutboxMessageRepository();
    const bus = new DomainEventBus();
    const received: string[] = [];
    bus.subscribe("tenancy.tenant.provisioned.v1", (event) => {
      received.push(event.eventId);
    });
    await appendOutboxMessage(fakeInsertingClient(outbox), {
      tenantId: "tenant-1",
      eventType: "tenancy.tenant.provisioned.v1",
      eventVersion: 1,
      aggregateType: "Tenant",
      aggregateId: "tenant-1",
      payload: { slug: "acme" },
      correlationId: "correlation-1",
      actor: { type: "USER", id: "user-1" },
    });
    const useCase = new DispatchOutboxBatchUseCase(outbox, bus);

    const result = await useCase.execute({ workerId: "worker-1" });

    expect(result).toEqual({ claimed: 1, published: 1, failed: 0 });
    expect(received).toHaveLength(1);
    expect(outbox.all()[0].status).toBe("PUBLISHED");
  });

  it("marks a message FAILED-retryable when its handler throws, without losing the row", async () => {
    const outbox = new InMemoryOutboxMessageRepository();
    const bus = new DomainEventBus();
    bus.subscribe("tenancy.tenant.provisioned.v1", () => {
      throw new Error("downstream unavailable");
    });
    await appendOutboxMessage(fakeInsertingClient(outbox), {
      tenantId: "tenant-1",
      eventType: "tenancy.tenant.provisioned.v1",
      eventVersion: 1,
      aggregateType: "Tenant",
      aggregateId: "tenant-1",
      payload: {},
      correlationId: "correlation-1",
      actor: null,
    });
    const useCase = new DispatchOutboxBatchUseCase(outbox, bus);

    const result = await useCase.execute({ workerId: "worker-1" });

    expect(result).toEqual({ claimed: 1, published: 0, failed: 1 });
    const stored = outbox.all()[0];
    expect(stored.status).toBe("PENDING"); // retryable, not dead-lettered on the first failure
    expect(stored.attemptCount).toBe(1);
  });

  it("does nothing when the outbox is empty", async () => {
    const outbox = new InMemoryOutboxMessageRepository();
    const bus = new DomainEventBus();
    const useCase = new DispatchOutboxBatchUseCase(outbox, bus);

    const result = await useCase.execute({ workerId: "worker-1" });

    expect(result).toEqual({ claimed: 0, published: 0, failed: 0 });
  });
});
