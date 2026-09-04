import { Inject, Injectable } from "@nestjs/common";
import { Prisma, type PrismaClient, type OutboxMessage as PrismaOutboxMessage } from "@erp/database";
import { OutboxMessage } from "../domain/outbox-message.entity";
import {
  ClaimOutboxBatchOptions,
  OutboxMessageRepository,
} from "../domain/outbox-message.repository";
import { PRISMA_CLIENT } from "./prisma-client.token";

@Injectable()
export class PrismaOutboxMessageRepository implements OutboxMessageRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /**
   * `SELECT ... FOR UPDATE SKIP LOCKED` requires raw SQL — Prisma's query
   * builder has no equivalent. Runs inside its own transaction so the
   * select-lock and the PROCESSING update are atomic: two dispatcher
   * instances racing this at the same time can never claim the same row
   * (docs/EVENTS.md §8.2).
   */
  async claimBatch(options: ClaimOutboxBatchOptions): Promise<OutboxMessage[]> {
    const leaseExpiredBefore = new Date(options.now.getTime() - options.leaseSeconds * 1000);

    return this.prisma.$transaction(async (tx) => {
      const claimable = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT "id" FROM "outbox_messages"
        WHERE ("status" = 'PENDING' AND "available_at" <= ${options.now})
           OR ("status" = 'PROCESSING' AND "locked_at" < ${leaseExpiredBefore})
        ORDER BY "available_at" ASC
        LIMIT ${options.limit}
        FOR UPDATE SKIP LOCKED
      `);
      if (claimable.length === 0) return [];

      const ids = claimable.map((row) => row.id);
      await tx.outboxMessage.updateMany({
        where: { id: { in: ids } },
        data: { status: "PROCESSING", lockedAt: options.now, lockedBy: options.lockedBy },
      });

      const records = await tx.outboxMessage.findMany({ where: { id: { in: ids } } });
      return records.map((record) => this.toDomain(record));
    });
  }

  async save(message: OutboxMessage): Promise<void> {
    const props = message.toProps();
    await this.prisma.outboxMessage.update({
      where: { id: props.id },
      data: {
        status: props.status,
        attemptCount: props.attemptCount,
        lastErrorCode: props.lastErrorCode,
        lockedAt: props.lockedAt,
        lockedBy: props.lockedBy,
        publishedAt: props.publishedAt,
        availableAt: props.availableAt,
      },
    });
  }

  private toDomain(record: PrismaOutboxMessage): OutboxMessage {
    return OutboxMessage.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      eventType: record.eventType,
      eventVersion: record.eventVersion,
      aggregateType: record.aggregateType,
      aggregateId: record.aggregateId,
      aggregateVersion: record.aggregateVersion,
      payload: record.payload,
      occurredAt: record.occurredAt,
      availableAt: record.availableAt,
      status: record.status,
      attemptCount: record.attemptCount,
      lastErrorCode: record.lastErrorCode,
      lockedAt: record.lockedAt,
      lockedBy: record.lockedBy,
      publishedAt: record.publishedAt,
      correlationId: record.correlationId,
      causationId: record.causationId,
      actorType: record.actorType as "USER" | "SYSTEM" | null,
      actorId: record.actorId,
      traceParent: record.traceParent,
      traceState: record.traceState,
      createdAt: record.createdAt,
    });
  }
}
