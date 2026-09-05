import { randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import {
  AddSalesOrderLineUseCase,
  CancelSalesOrderUseCase,
  ConfirmSalesOrderUseCase,
  CreateSalesOrderUseCase,
  ListSalesOrderLinesUseCase,
} from "../../../sales";
import { CapturePaymentUseCase } from "../../../payments";
import { CreateCustomerUseCase, FindCustomerByEmailUseCase } from "../../../customers";
import { addDecimal } from "../../domain/decimal";
import { CommerceOrder } from "../../domain/commerce-order.entity";
import { COMMERCE_ORDER_REPOSITORY, CommerceOrderRepository } from "../../domain/commerce-order.repository";
import { CART_LINE_REPOSITORY, CartLineRepository } from "../../domain/cart-line.repository";
import { CART_REPOSITORY, CartRepository } from "../../domain/cart.repository";
import { Storefront } from "../../domain/storefront.entity";
import { StorefrontSystemUserSeeder } from "../storefront-system-user-seeder";
import { CartHasNoLinesError, CartNotFoundError, CartNotOpenError, CommerceOrderIdempotencyConflictError, GuestEmailRequiredError } from "../errors";

export interface CheckoutInput {
  storefront: Storefront;
  correlationId: string;
  cartId: string;
  guestName: string;
  guestEmail: string;
  /** BANK_TRANSFER reference — see this use case's own docstring for why this is the only self-service payment path. */
  paymentReference?: string | null;
}

export interface CheckoutResult {
  order: CommerceOrder;
  /** True when this call replayed an already-completed checkout — the caller (audit trail) must not treat a replay as a fresh order. */
  wasReplayed: boolean;
}

/**
 * Orchestrates a complete online checkout purely through Sales/Payments/
 * Customers' own public contracts (docs/ARCHITECTURE.md §6), mirroring
 * POS's own `RingUpSaleUseCase` closely — but with two deliberate
 * differences, both ratified in `docs/DECISIONS.md` ADR-011:
 *
 * 1. **Idempotency is keyed by `cartId` itself, not a caller-supplied
 *    string.** A `Cart` converts to a `CommerceOrder` at most once
 *    (`Cart.convert()` throws for anything but `OPEN`), so the cart already
 *    IS the natural dedup key — a shopper's browser retrying "place this
 *    order" after a lost response naturally resends the same `cartId`, no
 *    client-generated idempotency key required. The real
 *    `@@unique([tenantId, cartId])` constraint on `commerce_orders` is what
 *    actually enforces "exactly one order per cart" under a genuine
 *    concurrent race, mirroring `PosSaleIdempotencyConflictError`'s own
 *    pre-check-plus-constraint shape.
 *
 * 2. **No forced payment capture, no auto-fulfillment.** Unlike an
 *    in-person POS sale, this codebase has no credentialed payment gateway
 *    (ADR-009) — there is no honest way to charge a card at checkout time.
 *    A `paymentReference` (BANK_TRANSFER) is captured immediately if
 *    provided; if not, the order is left `CONFIRMED` with `paymentId: null`
 *    on the resulting `CommerceOrder`, to be captured later by staff
 *    through the exact same `POST /api/v1/payments/capture` screen already
 *    built for every other channel. Fulfillment (picking/packing/shipping)
 *    is likewise always a later, separate staff action
 *    (`POST /api/v1/sales/orders/:id/fulfill`) — an online order is
 *    routinely paid and shipped hours or days after checkout, unlike a
 *    same-moment in-person sale.
 *
 * Any failure after the order is created triggers the same compensating
 * cancellation `RingUpSaleUseCase` already established: best-effort,
 * swallowing its own failure so it never masks the real error.
 */
@Injectable()
export class CheckoutUseCase {
  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY) private readonly commerceOrders: CommerceOrderRepository,
    @Inject(CART_REPOSITORY) private readonly carts: CartRepository,
    @Inject(CART_LINE_REPOSITORY) private readonly cartLines: CartLineRepository,
    private readonly findCustomerByEmail: FindCustomerByEmailUseCase,
    private readonly createCustomer: CreateCustomerUseCase,
    private readonly systemUser: StorefrontSystemUserSeeder,
    private readonly createSalesOrder: CreateSalesOrderUseCase,
    private readonly addSalesOrderLine: AddSalesOrderLineUseCase,
    private readonly confirmSalesOrder: ConfirmSalesOrderUseCase,
    private readonly cancelSalesOrder: CancelSalesOrderUseCase,
    private readonly listSalesOrderLines: ListSalesOrderLinesUseCase,
    private readonly capturePayment: CapturePaymentUseCase,
  ) {}

  async execute(input: CheckoutInput): Promise<CheckoutResult> {
    const existing = await this.commerceOrders.findByCartId(input.storefront.tenantId, input.storefront.companyId, input.cartId);
    if (existing) {
      return { order: existing, wasReplayed: true };
    }

    const guestEmail = input.guestEmail.trim().toLowerCase();
    if (!guestEmail) {
      throw new GuestEmailRequiredError();
    }

    const cart = await this.carts.findById(input.storefront.tenantId, input.cartId);
    if (!cart || cart.storefrontId !== input.storefront.id) {
      throw new CartNotFoundError();
    }
    if (cart.status !== "OPEN") {
      throw new CartNotOpenError();
    }

    const lines = await this.cartLines.listByCart(input.storefront.tenantId, cart.id);
    if (lines.length === 0) {
      throw new CartHasNoLinesError();
    }

    let customer = await this.findCustomerByEmail.execute(input.storefront.tenantId, input.storefront.companyId, guestEmail);
    if (!customer) {
      customer = await this.createCustomer.execute({
        tenantId: input.storefront.tenantId,
        companyId: input.storefront.companyId,
        // Real bug found via a demo-data seed script running several guest
        // checkouts back to back: UUIDv7's first 48 bits are a millisecond
        // timestamp (RFC 9562), so slicing the first 10 hex chars off
        // newId() carried almost no randomness — two checkouts within the
        // same coarse time bucket produced the identical "random" code and
        // the second one failed with a real 409. randomBytes is unrelated
        // to time and doesn't have this failure mode.
        code: `GUEST-${randomBytes(5).toString("hex").toUpperCase()}`,
        name: input.guestName.trim() || guestEmail,
        email: guestEmail,
      });
    }

    const actorUserId = await this.systemUser.ensureSeeded();

    let order = await this.createSalesOrder.execute({
      tenantId: input.storefront.tenantId,
      companyId: input.storefront.companyId,
      customerId: customer.id,
      channel: "ECOMMERCE",
      currency: cart.currency,
    });

    try {
      for (const line of lines) {
        await this.addSalesOrderLine.execute({
          tenantId: input.storefront.tenantId,
          companyId: input.storefront.companyId,
          salesOrderId: order.id,
          productId: line.productId,
          productVariantId: line.productVariantId,
          warehouseId: input.storefront.defaultWarehouseId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        });
      }

      order = await this.confirmSalesOrder.execute({
        tenantId: input.storefront.tenantId,
        companyId: input.storefront.companyId,
        actorUserId,
        correlationId: input.correlationId,
        salesOrderId: order.id,
      });

      const orderLines = await this.listSalesOrderLines.execute({
        tenantId: input.storefront.tenantId,
        companyId: input.storefront.companyId,
        salesOrderId: order.id,
      });
      let total = "0.0000";
      for (const line of orderLines) {
        total = addDecimal(total, line.lineTotal);
      }

      let paymentId: string | null = null;
      const reference = input.paymentReference?.trim();
      if (reference) {
        const captureResult = await this.capturePayment.execute({
          tenantId: input.storefront.tenantId,
          companyId: input.storefront.companyId,
          salesOrderId: order.id,
          method: "BANK_TRANSFER",
          amount: total,
          currency: order.currency,
          idempotencyKey: cart.id,
          reference,
        });
        if (captureResult.payment.status === "CAPTURED") {
          paymentId = captureResult.payment.id;
        }
        // A declined capture (e.g. adapter-level failure) does not abort
        // checkout — the order still exists, unpaid, for staff to retry
        // capture on later; only cart-line/inventory/confirm failures
        // trigger the compensating cancel below.
      }

      cart.convert();
      await this.carts.save(cart);

      const commerceOrder = CommerceOrder.create({
        id: newId(),
        tenantId: input.storefront.tenantId,
        companyId: input.storefront.companyId,
        storefrontId: input.storefront.id,
        cartId: cart.id,
        salesOrderId: order.id,
        paymentId,
        customerId: customer.id,
        guestEmail,
        total,
        currency: order.currency,
        createdAt: new Date(),
      });

      try {
        await this.commerceOrders.save(commerceOrder);
      } catch (error) {
        if (error instanceof CommerceOrderIdempotencyConflictError) {
          const winner = await this.commerceOrders.findByCartId(input.storefront.tenantId, input.storefront.companyId, cart.id);
          if (winner) {
            return { order: winner, wasReplayed: true };
          }
        }
        throw error;
      }

      return { order: commerceOrder, wasReplayed: false };
    } catch (error) {
      await this.safeCancel(input, actorUserId, order.id);
      throw error;
    }
  }

  private async safeCancel(input: CheckoutInput, actorUserId: string, salesOrderId: string): Promise<void> {
    try {
      await this.cancelSalesOrder.execute({
        tenantId: input.storefront.tenantId,
        companyId: input.storefront.companyId,
        actorUserId,
        correlationId: input.correlationId,
        salesOrderId,
      });
    } catch {
      // Best-effort compensation — never mask the real error the caller needs to see.
    }
  }
}
