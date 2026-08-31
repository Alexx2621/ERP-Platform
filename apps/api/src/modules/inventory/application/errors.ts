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

export class ProductNotFoundError extends Error {
  constructor() {
    super("Product was not found in this company.");
    this.name = "ProductNotFoundError";
  }
}

export class ProductInventoryNotTrackedError extends Error {
  constructor() {
    super("This product does not have inventory tracking enabled.");
    this.name = "ProductInventoryNotTrackedError";
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

export class SameWarehouseTransferError extends Error {
  constructor() {
    super("Transfer source and destination warehouses must be different.");
    this.name = "SameWarehouseTransferError";
  }
}

export class InsufficientInventoryError extends Error {
  constructor() {
    super("This movement would leave on-hand or available inventory negative.");
    this.name = "InsufficientInventoryError";
  }
}

export class InventoryTransferNotFoundError extends Error {
  constructor() {
    super("Inventory transfer was not found in this company.");
    this.name = "InventoryTransferNotFoundError";
  }
}

export class InventoryTransferNotInTransitError extends Error {
  constructor() {
    super("This transfer is not IN_TRANSIT and cannot be completed or cancelled.");
    this.name = "InventoryTransferNotInTransitError";
  }
}

export class InventoryReservationNotFoundError extends Error {
  constructor() {
    super("Inventory reservation was not found in this company.");
    this.name = "InventoryReservationNotFoundError";
  }
}

export class InventoryReservationNotActiveError extends Error {
  constructor() {
    super("This reservation is not ACTIVE and cannot be released.");
    this.name = "InventoryReservationNotActiveError";
  }
}
