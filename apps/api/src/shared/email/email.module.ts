import { Global, Logger, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EMAIL_DISPATCHER, SmtpEmailDispatcher, type EmailDispatcherPort } from "@erp/notifications";
import type { EnvironmentVariables } from "../config/environment-variables";

const logger = new Logger("EmailModule");

/**
 * Global, same shape as PrismaModule: any module anywhere (including
 * `@erp/notifications`'s own `RequestNotificationUseCase`) can inject
 * `EMAIL_DISPATCHER` without an explicit import. Deliberately provides
 * `undefined` (not a stub/fake) when `EMAIL_SMTP_HOST` is unset — a real
 * app boundary decision, not a default worth hiding: the EMAIL channel then
 * fails closed with an explanatory reason, exactly as documented in
 * `EnvironmentVariables`.
 */
@Global()
@Module({
  providers: [
    {
      provide: EMAIL_DISPATCHER,
      useFactory: (config: ConfigService<EnvironmentVariables, true>): EmailDispatcherPort | undefined => {
        const host = config.get("EMAIL_SMTP_HOST", { infer: true });
        if (!host) {
          logger.warn("EMAIL_SMTP_HOST not set — the EMAIL notification channel will fail closed.");
          return undefined;
        }
        const fromAddress = config.get("EMAIL_FROM_ADDRESS", { infer: true }) ?? "no-reply@localhost";
        return new SmtpEmailDispatcher({
          host,
          port: config.get("EMAIL_SMTP_PORT", { infer: true }),
          secure: config.get("EMAIL_SMTP_SECURE", { infer: true }) === "true",
          user: config.get("EMAIL_SMTP_USER", { infer: true }),
          password: config.get("EMAIL_SMTP_PASSWORD", { infer: true }),
          fromAddress,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [EMAIL_DISPATCHER],
})
export class EmailModule {}
