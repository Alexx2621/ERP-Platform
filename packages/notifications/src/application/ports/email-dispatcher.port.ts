export const EMAIL_DISPATCHER = Symbol("EMAIL_DISPATCHER");

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

/**
 * Abstracts the actual mail transport away from `RequestNotificationUseCase`
 * (MASTER_SPEC §22-style "storage compatible con S3" reasoning, applied to
 * email: SMTP is a provider-agnostic protocol, so this package never picks a
 * specific vendor). `@Optional()` at the injection site — a consuming app
 * that never provides this token (today: `apps/worker`) still resolves
 * `RequestNotificationUseCase` fine; the EMAIL channel simply fails closed
 * with an explanatory reason instead of throwing.
 */
export interface EmailDispatcherPort {
  send(input: SendEmailInput): Promise<void>;
}
