export class PlanNotFoundError extends Error {
  constructor(key: string) {
    super(`Plan "${key}" was not found in the catalog.`);
    this.name = "PlanNotFoundError";
  }
}

export class PlanNotSelfServeError extends Error {
  constructor(key: string) {
    super(`Plan "${key}" requires sales assistance and cannot be checked out directly.`);
    this.name = "PlanNotSelfServeError";
  }
}

export class TenantSubscriptionNotFoundError extends Error {
  constructor(tenantId: string) {
    super(`Tenant "${tenantId}" has no subscription yet.`);
    this.name = "TenantSubscriptionNotFoundError";
  }
}

/** A P2002 on `TenantSubscription`'s per-tenant unique constraint — two concurrent writers raced. */
export class TenantSubscriptionConflictError extends Error {
  constructor() {
    super("A subscription for this tenant was just written by a concurrent request.");
    this.name = "TenantSubscriptionConflictError";
  }
}

export class RecurrenteApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`Recurrente API request failed with status ${status}.`);
    this.name = "RecurrenteApiError";
  }
}

export class RecurrenteNotConfiguredError extends Error {
  constructor() {
    super("RECURRENTE_SECRET_KEY is not configured — no real Recurrente credentials available.");
    this.name = "RecurrenteNotConfiguredError";
  }
}

export class InvalidWebhookSignatureError extends Error {
  constructor() {
    super("Recurrente webhook signature verification failed.");
    this.name = "InvalidWebhookSignatureError";
  }
}

export class WebhookAlreadyProcessedError extends Error {
  constructor(providerEventId: string) {
    super(`Webhook event "${providerEventId}" was already processed.`);
    this.name = "WebhookAlreadyProcessedError";
  }
}
