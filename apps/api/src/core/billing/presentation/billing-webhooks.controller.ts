import { Controller, Headers, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { HandleRecurrenteWebhookUseCase } from "../application/use-cases/handle-recurrente-webhook.use-case";
import { handleBillingError } from "./billing-error.mapper";

/**
 * Genuinely public and unauthenticated — the caller is Recurrente's own
 * servers, not a session-carrying user. Its own authentication *is* the
 * Svix signature verification performed inside
 * `HandleRecurrenteWebhookUseCase` (docs/DECISIONS.md ADR-016 point 5), so
 * this controller carries no `SessionAuthGuard`. `ApiExcludeController`
 * keeps it off the public Swagger surface, same reasoning webhook
 * receivers everywhere use: it is not a client-facing API operation.
 * Requires `request.rawBody` (see `main.ts`'s `rawBody: true`) — Svix
 * verification breaks if the body is re-serialized from its parsed form.
 */
@ApiExcludeController()
@Controller("api/v1/billing/webhooks/recurrente")
export class BillingWebhooksController {
  constructor(private readonly handleWebhook: HandleRecurrenteWebhookUseCase) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers("svix-id") svixId: string,
    @Headers("svix-timestamp") svixTimestamp: string,
    @Headers("svix-signature") svixSignature: string,
  ): Promise<void> {
    try {
      await this.handleWebhook.execute({
        rawBody: request.rawBody ?? Buffer.from(""),
        headers: {
          "svix-id": svixId,
          "svix-timestamp": svixTimestamp,
          "svix-signature": svixSignature,
        },
      });
    } catch (error) {
      handleBillingError(error);
    }
  }
}
