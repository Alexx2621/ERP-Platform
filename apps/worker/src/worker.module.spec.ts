import { Test } from "@nestjs/testing";
import {
  DomainEventBus,
  DispatchOutboxBatchUseCase,
  OutboxPurgeScheduler,
  PurgePublishedOutboxMessagesUseCase,
} from "@erp/events";
import { RequestNotificationUseCase } from "@erp/notifications";
import { WorkerModule } from "./worker.module";
import { PrismaService } from "./shared/prisma/prisma.service";
import { HealthController } from "./health/health.controller";
import { TenantProvisionedNotificationHandler } from "./notifications/tenant-provisioned-notification.handler";

/**
 * Boots the real WorkerModule graph with only PrismaService stubbed out, so
 * a broken import or missing provider fails here instead of only being
 * discoverable at real process startup — same reasoning as apps/api's
 * app.module.spec.ts.
 */
describe("WorkerModule wiring", () => {
  it("compiles the full module graph with the dispatcher and health controller resolvable", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [WorkerModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(moduleRef.get(DomainEventBus)).toBeInstanceOf(DomainEventBus);
    expect(moduleRef.get(DispatchOutboxBatchUseCase)).toBeInstanceOf(DispatchOutboxBatchUseCase);
    expect(moduleRef.get(HealthController)).toBeInstanceOf(HealthController);
    expect(moduleRef.get(RequestNotificationUseCase)).toBeInstanceOf(RequestNotificationUseCase);
    expect(moduleRef.get(TenantProvisionedNotificationHandler)).toBeInstanceOf(
      TenantProvisionedNotificationHandler,
    );
    expect(moduleRef.get(PurgePublishedOutboxMessagesUseCase)).toBeInstanceOf(
      PurgePublishedOutboxMessagesUseCase,
    );
    expect(moduleRef.get(OutboxPurgeScheduler)).toBeInstanceOf(OutboxPurgeScheduler);

    await moduleRef.close();
  });
});
