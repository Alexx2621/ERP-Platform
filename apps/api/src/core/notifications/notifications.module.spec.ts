import { Global, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { NotificationsModule } from "./notifications.module";
import { RequestNotificationUseCase } from "./application/use-cases/request-notification.use-case";
import { ListNotificationsUseCase } from "./application/use-cases/list-notifications.use-case";
import { MarkNotificationReadUseCase } from "./application/use-cases/mark-notification-read.use-case";

@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: {} }],
  exports: [PrismaService],
})
class StubInfraModule {}

describe("NotificationsModule wiring", () => {
  it("resolves every notification use case with zero dependency on any other core module", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [StubInfraModule, NotificationsModule],
    }).compile();

    expect(moduleRef.get(RequestNotificationUseCase)).toBeInstanceOf(RequestNotificationUseCase);
    expect(moduleRef.get(ListNotificationsUseCase)).toBeInstanceOf(ListNotificationsUseCase);
    expect(moduleRef.get(MarkNotificationReadUseCase)).toBeInstanceOf(MarkNotificationReadUseCase);

    await moduleRef.close();
  });
});
