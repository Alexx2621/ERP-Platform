import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./shared/errors/http-exception.filter";
import type { EnvironmentVariables } from "./shared/config/environment-variables";

const SWAGGER_PATH = "api/docs";

// Route paths already carry the "api/v1" prefix explicitly (MASTER_SPEC §25),
// so Nest's own versioning system is deliberately not layered on top of it.
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<EnvironmentVariables, true>);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Left reachable in every environment (MASTER_SPEC §25) — the spec
  // describes request/response shapes and permission requirements, not
  // secrets, so there is no confidentiality reason to gate it behind an
  // environment check. Reconsider only if a future authenticated-only
  // developer portal (MASTER_SPEC §89) supersedes this.
  const swaggerConfig = new DocumentBuilder()
    .setTitle("ERP Platform API")
    .setDescription(
      "REST API for the ERP Platform Foundation (MASTER_SPEC.md, ARCHITECTURE.md). " +
        "Tenant-scoped endpoints require the X-Tenant-Slug header (and, where a " +
        "company context applies, X-Company-Id) — see docs/MULTITENANCY.md §6.1.",
    )
    .setVersion("1.0")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "opaque token" }, "session")
    .addTag("Authentication")
    .addTag("Tenants")
    .addTag("Access Control")
    .addTag("Audit")
    .addTag("Configuration")
    .addTag("Files")
    .addTag("Notifications")
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(SWAGGER_PATH, app, swaggerDocument);

  const port = config.get("PORT", { infer: true });
  await app.listen(port);
  Logger.log(`API listening on port ${port}`, "Bootstrap");
  Logger.log(`API docs available at /${SWAGGER_PATH}`, "Bootstrap");
}

bootstrap();
