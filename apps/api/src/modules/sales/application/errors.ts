export class CompanyContextRequiredError extends Error {
  constructor() {
    super("This operation requires an active company context (X-Company-Id).");
    this.name = "CompanyContextRequiredError";
  }
}

export class CustomerNotFoundError extends Error {
  constructor() {
    super("Customer was not found in this company.");
    this.name = "CustomerNotFoundError";
  }
}

export class ProductNotFoundError extends Error {
  constructor() {
    super("Product was not found in this company.");
    this.name = "ProductNotFoundError";
  }
}

export class ProductVariantRequiredError extends Error {
  constructor() {
    super("This product has variants; a productVariantId is required.");
    this.name = "ProductVariantRequiredError";
  }
}

export class ProductVariantNotAllowedError extends Error {
  constructor() {
    super("This product has no variants; productVariantId must not be provided.");
    this.name = "ProductVariantNotAllowedError";
  }
}

export class ProductVariantNotFoundError extends Error {
  constructor() {
    super("Product variant was not found for this product.");
    this.name = "ProductVariantNotFoundError";
  }
}

export class WarehouseNotFoundError extends Error {
  constructor() {
    super("Warehouse was not found in this company.");
    this.name = "WarehouseNotFoundError";
  }
}

export class WarehouseRequiredError extends Error {
  constructor() {
    super("This product tracks inventory; a warehouseId is required.");
    this.name = "WarehouseRequiredError";
  }
}

export class WarehouseNotAllowedError extends Error {
  constructor() {
    super("This product does not track inventory; warehouseId must not be provided.");
    this.name = "WarehouseNotAllowedError";
  }
}

export class TaxNotFoundError extends Error {
  constructor() {
    super("Tax was not found in this company.");
    this.name = "TaxNotFoundError";
  }
}

export class QuoteNotFoundError extends Error {
  constructor() {
    super("Quote was not found in this company.");
    this.name = "QuoteNotFoundError";
  }
}

export class QuoteNotDraftError extends Error {
  constructor() {
    super("This quote is not in DRAFT status.");
    this.name = "QuoteNotDraftError";
  }
}

export class QuoteHasNoLinesError extends Error {
  constructor() {
    super("A quote requires at least one line to be converted.");
    this.name = "QuoteHasNoLinesError";
  }
}

export class SalesOrderNotFoundError extends Error {
  constructor() {
    super("Sales order was not found in this company.");
    this.name = "SalesOrderNotFoundError";
  }
}

export class SalesOrderNotDraftError extends Error {
  constructor() {
    super("This sales order is not in DRAFT status.");
    this.name = "SalesOrderNotDraftError";
  }
}

export class SalesOrderNotConfirmedError extends Error {
  constructor() {
    super("This sales order is not CONFIRMED.");
    this.name = "SalesOrderNotConfirmedError";
  }
}

export class SalesOrderNotCancellableError extends Error {
  constructor() {
    super("This sales order can no longer be cancelled.");
    this.name = "SalesOrderNotCancellableError";
  }
}

export class SalesOrderHasNoLinesError extends Error {
  constructor() {
    super("A sales order requires at least one line to be confirmed.");
    this.name = "SalesOrderHasNoLinesError";
  }
}

export class InsufficientInventoryForOrderError extends Error {
  constructor(productId: string) {
    super(`Insufficient available inventory to confirm this order (product ${productId}).`);
    this.name = "InsufficientInventoryForOrderError";
  }
}

export class SalesOrderNotFulfilledError extends Error {
  constructor() {
    super("A return requires the sales order to be FULFILLED.");
    this.name = "SalesOrderNotFulfilledError";
  }
}

export class SalesOrderLineNotFoundError extends Error {
  constructor() {
    super("Sales order line was not found on this order.");
    this.name = "SalesOrderLineNotFoundError";
  }
}

export class SalesReturnNotFoundError extends Error {
  constructor() {
    super("Sales return was not found in this company.");
    this.name = "SalesReturnNotFoundError";
  }
}

export class SalesReturnExceedsFulfilledQuantityError extends Error {
  constructor() {
    super("This return would exceed the quantity ever fulfilled for this line.");
    this.name = "SalesReturnExceedsFulfilledQuantityError";
  }
}

export class SalesReturnHasNoLinesError extends Error {
  constructor() {
    super("A return requires at least one line.");
    this.name = "SalesReturnHasNoLinesError";
  }
}
