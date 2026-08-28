import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { OutboxDispatcherModule } from "@erp/events";
import { validateEnvironment } from "./shared/config/environment-variables";
import { PrismaModule } from "./shared/prisma/prisma.module";
import { HealthController } from "./health/health.controller";

/**
 * Composition root for the worker process. Runs the outbox dispatcher
 * (extracted from `apps/api` — ADR-004's amendment) and nothing else yet;
 * `apps/api` remains the only HTTP surface for business requests.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    OutboxDispatcherModule,
  ],
  controllers: [HealthController],
})
export class WorkerModule {}
