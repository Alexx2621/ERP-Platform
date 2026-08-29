import { Inject, Injectable } from "@nestjs/common";
import { Prisma, newId, type PrismaClient } from "@erp/database";
import { ClaimInboxMessageOptions, InboxMessageRepository } from "../domain/inbox-message.repository";
import { PRISMA_CLIENT } from "./prisma-client.token";

@Injectable()
export class PrismaInboxMessageRepository implements InboxMessageRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /**
   * `SELECT ... FOR UPDATE` locks an existing row for the duration of the
   * transaction, so a concurrent claimant blocks until this one commits —
   * no two callers can both see a live lease as expired. A genuinely new
   * (consumerName, messageId) pair has no row to lock, so two concurrent
   * first-time claimants could both attempt the INSERT; the unique
   * constraint on (consumer_name, message_id) makes exactly one of them
   * succeed, and the loser's P2002 is caught and treated as "not claimed".
   */
  async tryClaim(options: ClaimInboxMessageOptions): Promise<boolean> {
    const leaseExpiredBefore = new Date(options.now.getTime() - options.leaseSeconds * 1000);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.$queryRaw<{ id: string; status: string; locked_at: Date }[]>(Prisma.sql`
          SELECT "id", "status", "locked_at" FROM "inbox_messages"
          WHERE "consumer_name" = ${options.consumerName} AND "message_id" = ${options.messageId}
          FOR UPDATE
        `);

        if (existing.length === 0) {
          await tx.inboxMessage.create({
            data: {
              id: newId(),
              consumerName: options.consumerName,
              messageId: options.messageId,
              tenantId: options.tenantId,
              status: "PROCESSING",
              attemptCount: 0,
              lockedAt: options.now,
              createdAt: options.now,
            },
          });
          return true;
        }

        const row = existing[0];
        if (row.status === "PROCESSED") return false;
        if (row.locked_at >= leaseExpiredBefore) return false;

        await tx.inboxMessage.update({
          where: { id: row.id },
          data: { lockedAt: options.now, attemptCount: { increment: 1 } },
        });
        return true;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return false;
      }
      throw error;
    }
  }

  async markProcessed(consumerName: string, messageId: string, now: Date): Promise<void> {
    await this.prisma.inboxMessage.update({
      where: { consumerName_messageId: { consumerName, messageId } },
      data: { status: "PROCESSED", processedAt: now },
    });
  }

  async markFailed(consumerName: string, messageId: string, _now: Date, errorCode: string): Promise<void> {
    await this.prisma.inboxMessage.update({
      where: { consumerName_messageId: { consumerName, messageId } },
      data: { lastErrorCode: errorCode.slice(0, 150) },
    });
  }
}
