import { RecurrenteApiError } from "../application/errors";

const RECURRENTE_API_BASE_URL = "https://app.recurrente.com/api";

export interface CreateRecurringProductInput {
  name: string;
  description: string;
  amountInCents: number;
  currency: "GTQ" | "USD";
  billingInterval: "week" | "month" | "year";
}

export interface CreateRecurringProductResult {
  productId: string;
  priceId: string;
}

export interface CreateCustomerInput {
  email: string;
  name: string;
}

export interface CreateCheckoutInput {
  priceId: string;
  customerId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutResult {
  checkoutId: string;
  checkoutUrl: string;
}

/**
 * Direct REST calls against Recurrente's real, published API
 * (docs.recurrente.com) via the runtime's own `fetch` — no official
 * Node/TypeScript SDK exists (confirmed by research, not assumed), the
 * same "call the vendor's REST API directly, no SDK dependency" precedent
 * already set for other external integrations in this codebase
 * (docs/DECISIONS.md ADR-016 point 9). Every request/response field name
 * below was verified against Recurrente's real OpenAPI spec before being
 * written, not guessed (MASTER_SPEC §91).
 */
export class RecurrenteClient {
  constructor(private readonly secretKey: string) {}

  async createRecurringProduct(input: CreateRecurringProductInput): Promise<CreateRecurringProductResult> {
    // `POST /products`'s real request body is wrapped under a top-level
    // `product` key (confirmed against Recurrente's own OpenAPI spec,
    // MASTER_SPEC §91) — unlike `/customers`/`/checkouts`, which are flat.
    // Missing this wrapper does not error: the request still returns 201
    // with a real Product created, just silently ignoring every nested
    // field (including `prices_attributes`) — the first thing real
    // sandbox verification surfaced.
    const created = await this.request<{ id: string; prices: { id: string }[] }>("POST", "/products", {
      product: {
        name: input.name,
        description: input.description,
        prices_attributes: [
          {
            amount_in_cents: input.amountInCents,
            currency: input.currency,
            charge_type: "recurring",
            billing_interval: input.billingInterval,
          },
        ],
      },
    });

    // A second, real gap confirmed against the sandbox: even with the
    // wrapper fixed, `POST /products`'s own response never includes the
    // nested price it just created (`prices: []`) — a real Recurrente
    // response-serialization quirk (the association isn't eagerly
    // reloaded into that same response), not a data problem. A follow-up
    // `GET /products/:id` reliably returns the real price that was
    // created moments earlier — confirmed directly against the sandbox
    // (`price_...` present on GET, absent on the POST that created it).
    const fetched = await this.request<{ id: string; prices: { id: string }[] }>("GET", `/products/${created.id}`);
    const price = fetched.prices[0];
    if (!price) {
      throw new RecurrenteApiError(502, fetched);
    }
    return { productId: fetched.id, priceId: price.id };
  }

  async createCustomer(input: CreateCustomerInput): Promise<{ customerId: string }> {
    // `full_name`, not `name`, is the real required field — confirmed
    // against the sandbox: sending `name` alone creates nothing and fails
    // closed with a real `400` ("full_name no puede estar en blanco").
    // Recurrente's own response still surfaces the value back as `name`.
    const body = await this.request<{ id: string }>("POST", "/customers", {
      email: input.email,
      full_name: input.name,
    });
    return { customerId: body.id };
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const body = await this.request<{ id: string; checkout_url: string }>("POST", "/checkouts", {
      items: [{ price_id: input.priceId, quantity: 1 }],
      customer_id: input.customerId,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });
    return { checkoutId: body.id, checkoutUrl: body.checkout_url };
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${RECURRENTE_API_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-SECRET-KEY": this.secretKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let parsedBody: unknown;
      try {
        parsedBody = await response.json();
      } catch {
        parsedBody = await response.text().catch(() => undefined);
      }
      throw new RecurrenteApiError(response.status, parsedBody);
    }

    return (await response.json()) as T;
  }
}

export const RECURRENTE_CLIENT = Symbol("RECURRENTE_CLIENT");
