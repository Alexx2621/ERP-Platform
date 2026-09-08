import { Injectable } from "@nestjs/common";
import { Prisma, type BillingWebhookEvent as PrismaBillingWebhookEvent } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { BillingWebhookEvent } from "../domain/billing-webhook-event.entity";
import { BillingWebhookEventRepository } from "../domain/billing-webhook-event.repository";
import { WebhookAlreadyProcessedError } from "../application/errors";

@Injectable()
export class PrismaBillingWebhookEventRepository implements BillingWebhookEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProviderEventId(providerEventId: string): Promise<BillingWebhookEvent | null> {
    const record = await this.prisma.billingWebhookEvent.findUnique({ where: { providerEventId } });
    return record ? this.toDomain(record) : null;
  }

  /**
   * A P2002 on `providerEventId` means a genuinely concurrent redelivery
   * raced past `HandleRecurrenteWebhookUseCase`'s own pre-check — the real
   * unique-constraint layer of the "unique-constraint-as-idempotency"
   * pattern already established by `Payment.idempotencyKey`.
   */
  async create(event: BillingWebhookEvent): Promise<void> {
    const props = event.toProps();
    try {
      await this.prisma.billingWebhookEvent.create({
        data: {
          id: props.id,
          providerEventId: props.providerEventId,
          eventType: props.eventType,
          payload: props.payload as Prisma.InputJsonValue,
          processedAt: props.processedAt,
          createdAt: props.createdAt,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new WebhookAlreadyProcessedError(props.providerEventId);
      }
      throw error;
    }
  }

  async save(event: BillingWebhookEvent): Promise<void> {
    const props = event.toProps();
    await this.prisma.billingWebhookEvent.update({
      where: { id: props.id },
      data: { processedAt: props.processedAt },
    });
  }

  private toDomain(record: PrismaBillingWebhookEvent): BillingWebhookEvent {
    return BillingWebhookEvent.create({
      id: record.id,
      providerEventId: record.providerEventId,
      eventType: record.eventType,
      payload: record.payload,
      processedAt: record.processedAt,
      createdAt: record.createdAt,
    });
  }
}
