import { Injectable } from "@nestjs/common";
import { Webhook } from "svix";
import { WebhookHeaders, WebhookVerifierPort } from "../application/ports/webhook-verifier.port";
import { InvalidWebhookSignatureError } from "../application/errors";

/**
 * Verifies a Recurrente webhook's Svix signature using the official
 * `svix` package (docs/DECISIONS.md ADR-016 point 5) — Recurrente's own
 * webhook guide names it as the recommended verification method, and this
 * codebase consistently prefers an official, maintained library over
 * hand-rolling security-critical comparison logic (the same reasoning
 * already applied to `nodemailer`/`@aws-sdk/client-s3` for other external
 * protocols). Pinned to `svix@^1.99.1` (CommonJS) rather than the ESM-only
 * `2.x` line, since this entire codebase compiles to CommonJS.
 *
 * `verify()` requires the **raw, unparsed request body** — re-serializing
 * a parsed JSON object would silently break the signature (see
 * `main.ts`'s `rawBody: true` and the webhook controller's use of
 * `request.rawBody`).
 */
@Injectable()
export class SvixWebhookVerifier implements WebhookVerifierPort {
  verify(secret: string, rawBody: Buffer | string, headers: WebhookHeaders): unknown {
    try {
      return new Webhook(secret).verify(rawBody, headers);
    } catch {
      throw new InvalidWebhookSignatureError();
    }
  }
}
