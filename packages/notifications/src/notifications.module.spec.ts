import { Global, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { NotificationsModule } from "./notifications.module";
import { PRISMA_CLIENT } from "./infrastructure/prisma-client.token";
import { RequestNotificationUseCase } from "./application/use-cases/request-notification.use-case";
import { ListNotificationsUseCase } from "./application/use-cases/list-notifications.use-case";
import { MarkNotificationReadUseCase } from "./application/use-cases/mark-notification-read.use-case";

@Global()
@Module({
  providers: [{ provide: PRISMA_CLIENT, useValue: {} }],
  exports: [PRISMA_CLIENT],
})
class StubPrismaModule {}

describe("NotificationsModule wiring", () => {
  it("resolves every notification use case given a PRISMA_CLIENT provided elsewhere in the graph", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [StubPrismaModule, NotificationsModule],
    }).compile();

    expect(moduleRef.get(RequestNotificationUseCase)).toBeInstanceOf(RequestNotificationUseCase);
    expect(moduleRef.get(ListNotificationsUseCase)).toBeInstanceOf(ListNotificationsUseCase);
    expect(moduleRef.get(MarkNotificationReadUseCase)).toBeInstanceOf(MarkNotificationReadUseCase);

    await moduleRef.close();
  });
});
