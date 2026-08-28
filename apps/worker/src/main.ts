import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WorkerModule } from "./worker.module";
import type { EnvironmentVariables } from "./shared/config/environment-variables";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(WorkerModule);
  const config = app.get(ConfigService<EnvironmentVariables, true>);

  const port = config.get("PORT", { infer: true });
  await app.listen(port);
  Logger.log(`Worker health endpoint listening on port ${port}`, "Bootstrap");
}

bootstrap();
