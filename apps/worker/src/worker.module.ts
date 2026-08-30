import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { OutboxDispatcherModule } from "@erp/events";
import { NotificationsModule } from "@erp/notifications";
import { validateEnvironment } from "./shared/config/environment-variables";
import { PrismaModule } from "./shared/prisma/prisma.module";
import { HealthController } from "./health/health.controller";
import { TenantProvisionedNotificationHandler } from "./notifications/tenant-provisioned-notification.handler";

/**
 * Composition root for the worker process. Runs the outbox dispatcher
 * (extracted from `apps/api` — ADR-004's amendment) and, since this session,
 * the first real cross-process `DomainEventBus` consumer:
 * `TenantProvisionedNotificationHandler` requests the tenant-owner
 * notification for `tenancy.tenant.provisioned.v1` (docs/WORK_QUEUE.md item
 * 1) — `apps/api` remains the only HTTP surface for business requests.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    OutboxDispatcherModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [TenantProvisionedNotificationHandler],
})
export class WorkerModule {}
