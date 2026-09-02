export class CompanyContextRequiredError extends Error {
  constructor() {
    super("This operation requires an active company context (X-Company-Id).");
    this.name = "CompanyContextRequiredError";
  }
}

export class WarehouseNotFoundError extends Error {
  constructor() {
    super("Warehouse was not found in this company.");
    this.name = "WarehouseNotFoundError";
  }
}

export class StorefrontNotFoundError extends Error {
  constructor() {
    super("Storefront was not found.");
    this.name = "StorefrontNotFoundError";
  }
}

export class StorefrontCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`Storefront code "${code}" is already in use.`);
    this.name = "StorefrontCodeAlreadyInUseError";
  }
}

export class StorefrontNotActiveError extends Error {
  constructor() {
    super("This storefront is INACTIVE.");
    this.name = "StorefrontNotActiveError";
  }
}

/** Commerce's own version — mirrors Sales' error of the same name, but for the cart-add path, which never calls Sales directly (only checkout does). */
export class ProductVariantRequiredError extends Error {
  constructor() {
    super("This product has variants; productVariantId is required.");
    this.name = "ProductVariantRequiredError";
  }
}

export class ProductVariantNotAllowedError extends Error {
  constructor() {
    super("This product has no variants; productVariantId must not be provided.");
    this.name = "ProductVariantNotAllowedError";
  }
}

export class StorefrontProductNotFoundError extends Error {
  constructor() {
    super("This product is not published to this storefront.");
    this.name = "StorefrontProductNotFoundError";
  }
}

export class StorefrontWarehouseNotConfiguredError extends Error {
  constructor() {
    super("This storefront has no default warehouse configured, but the cart contains a product that tracks inventory.");
    this.name = "StorefrontWarehouseNotConfiguredError";
  }
}

export class CartNotFoundError extends Error {
  constructor() {
    super("Cart was not found for this storefront.");
    this.name = "CartNotFoundError";
  }
}

export class CartNotOpenError extends Error {
  constructor() {
    super("This cart is not OPEN.");
    this.name = "CartNotOpenError";
  }
}

export class CartLineNotFoundError extends Error {
  constructor() {
    super("Cart line was not found in this cart.");
    this.name = "CartLineNotFoundError";
  }
}

export class CartHasNoLinesError extends Error {
  constructor() {
    super("Checkout requires at least one cart line.");
    this.name = "CartHasNoLinesError";
  }
}

export class GuestEmailRequiredError extends Error {
  constructor() {
    super("A guest email is required to check out.");
    this.name = "GuestEmailRequiredError";
  }
}

export class CommerceOrderNotFoundError extends Error {
  constructor() {
    super("Order was not found for this storefront.");
    this.name = "CommerceOrderNotFoundError";
  }
}

export class CheckoutPaymentFailedError extends Error {
  constructor(reason: string) {
    super(`Payment was declined: ${reason}`);
    this.name = "CheckoutPaymentFailedError";
  }
}

/** Internal, infrastructure-raised signal for a real concurrent race on the same cart's checkout — never returned to an HTTP caller directly (mirrors `PosSaleIdempotencyConflictError`). */
export class CommerceOrderIdempotencyConflictError extends Error {
  constructor() {
    super("An order for this cart was just created by a concurrent request.");
    this.name = "CommerceOrderIdempotencyConflictError";
  }
}
