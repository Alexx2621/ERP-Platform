import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { EventsModule } from "./events.module";
import { DomainEventBus } from "./application/domain-event-bus";
import { DispatchOutboxBatchUseCase } from "./application/use-cases/dispatch-outbox-batch.use-case";

@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: {} }],
  exports: [PrismaService],
})
class StubInfraModule {}

describe("EventsModule wiring", () => {
  it("resolves DomainEventBus and DispatchOutboxBatchUseCase with zero dependency on any other core module", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ OUTBOX_DISPATCH_INTERVAL_MS: 60_000 })],
        }),
        StubInfraModule,
        EventsModule,
      ],
    }).compile();

    expect(moduleRef.get(DomainEventBus)).toBeInstanceOf(DomainEventBus);
    expect(moduleRef.get(DispatchOutboxBatchUseCase)).toBeInstanceOf(DispatchOutboxBatchUseCase);

    await moduleRef.close();
  });
});
