import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { OutboxDispatcherModule } from "./outbox-dispatcher.module";
import { PRISMA_CLIENT } from "./infrastructure/prisma-client.token";
import { DomainEventBus } from "./application/domain-event-bus";
import { DispatchOutboxBatchUseCase } from "./application/use-cases/dispatch-outbox-batch.use-case";

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
          load: [() => ({ OUTBOX_DISPATCH_INTERVAL_MS: 60_000 })],
        }),
        StubPrismaModule,
        OutboxDispatcherModule,
      ],
    }).compile();

    expect(moduleRef.get(DomainEventBus)).toBeInstanceOf(DomainEventBus);
    expect(moduleRef.get(DispatchOutboxBatchUseCase)).toBeInstanceOf(DispatchOutboxBatchUseCase);

    await moduleRef.close();
  });
});
