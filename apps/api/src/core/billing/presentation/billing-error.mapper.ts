import { HttpStatus } from "@nestjs/common";
import { AppException } from "../../../shared/errors/app.exception";
import {
  InvalidWebhookSignatureError,
  PlanNotFoundError,
  PlanNotSelfServeError,
  RecurrenteApiError,
  RecurrenteNotConfiguredError,
  TenantSubscriptionConflictError,
  TenantSubscriptionNotFoundError,
} from "../application/errors";

export function handleBillingError(error: unknown): never {
  if (error instanceof PlanNotFoundError) {
    throw new AppException("PLAN_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof PlanNotSelfServeError) {
    throw new AppException("PLAN_NOT_SELF_SERVE", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof TenantSubscriptionNotFoundError) {
    throw new AppException("TENANT_SUBSCRIPTION_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
  }
  if (error instanceof TenantSubscriptionConflictError) {
    throw new AppException("TENANT_SUBSCRIPTION_CONFLICT", error.message, HttpStatus.CONFLICT);
  }
  if (error instanceof RecurrenteNotConfiguredError) {
    throw new AppException("RECURRENTE_NOT_CONFIGURED", error.message, HttpStatus.SERVICE_UNAVAILABLE);
  }
  if (error instanceof RecurrenteApiError) {
    throw new AppException("RECURRENTE_API_ERROR", error.message, HttpStatus.BAD_GATEWAY, {
      providerStatus: error.status,
    });
  }
  if (error instanceof InvalidWebhookSignatureError) {
    throw new AppException("INVALID_WEBHOOK_SIGNATURE", error.message, HttpStatus.UNAUTHORIZED);
  }
  throw error;
}
