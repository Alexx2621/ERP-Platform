export interface WebhookHeaders {
  "svix-id": string;
  "svix-timestamp": string;
  "svix-signature": string;
}

export const WEBHOOK_VERIFIER = Symbol("WEBHOOK_VERIFIER");

/**
 * Verifies an inbound webhook's authenticity before any business logic
 * runs (docs/DECISIONS.md ADR-016 point 5). `SvixWebhookVerifier` (via
 * the official `svix` package) is the only real implementation — kept as
 * a port, mirroring `PaymentGateway`/`FileStoragePort`/`EmailDispatcherPort`,
 * so `HandleRecurrenteWebhookUseCase` can be unit-tested against a fake
 * without needing a real, correctly-signed payload for every test.
 */
export interface WebhookVerifierPort {
  /** Returns the verified, parsed payload. Throws `InvalidWebhookSignatureError` if verification fails. */
  verify(secret: string, rawBody: Buffer | string, headers: WebhookHeaders): unknown;
}
