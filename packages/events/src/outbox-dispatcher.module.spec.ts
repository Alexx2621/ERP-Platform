import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { OutboxDispatcherModule } from "./outbox-dispatcher.module";
import { PRISMA_CLIENT } from "./infrastructure/prisma-client.token";
import { DomainEventBus } from "./application/domain-event-bus";
import { DispatchOutboxBatchUseCase } from "./application/use-cases/dispatch-outbox-batch.use-case";
import { INBOX_MESSAGE_REPOSITORY } from "./domain/inbox-message.repository";
import { PurgePublishedOutboxMessagesUseCase } from "./application/use-cases/purge-published-outbox-messages.use-case";
import { OutboxPurgeScheduler } from "./application/outbox-purge.scheduler";

@Global()
@Module({
  providers: [{ provide: PRISMA_CLIENT, useValue: {} }],
  exports: [PRISMA_CLIENT],
})
class StubPrismaModule {}

describe("OutboxDispatcherModule wiring", () => {
  it("resolves DomainEventBus and DispatchOutboxBatchUseCase given a PRISMA_CLIENT provided elsewhere in the graph", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              OUTBOX_DISPATCH_INTERVAL_MS: 60_000,
              OUTBOX_PURGE_INTERVAL_MS: 60_000,
              OUTBOX_PURGE_RETENTION_DAYS: 30,
              OUTBOX_PURGE_BATCH_SIZE: 500,
            }),
          ],
        }),
        StubPrismaModule,
        OutboxDispatcherModule,
      ],
    }).compile();

    expect(moduleRef.get(DomainEventBus)).toBeInstanceOf(DomainEventBus);
    expect(moduleRef.get(DispatchOutboxBatchUseCase)).toBeInstanceOf(DispatchOutboxBatchUseCase);
    expect(moduleRef.get(INBOX_MESSAGE_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(PurgePublishedOutboxMessagesUseCase)).toBeInstanceOf(
      PurgePublishedOutboxMessagesUseCase,
    );
    expect(moduleRef.get(OutboxPurgeScheduler)).toBeInstanceOf(OutboxPurgeScheduler);

    await moduleRef.close();
  });
});
