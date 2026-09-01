export class CompanyContextRequiredError extends Error {
  constructor() {
    super("This operation requires an active company context (X-Company-Id).");
    this.name = "CompanyContextRequiredError";
  }
}

export class SupplierNotFoundError extends Error {
  constructor() {
    super("Supplier was not found in this company.");
    this.name = "SupplierNotFoundError";
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

export class PurchaseOrderNotFoundError extends Error {
  constructor() {
    super("Purchase order was not found in this company.");
    this.name = "PurchaseOrderNotFoundError";
  }
}

export class PurchaseOrderNotDraftError extends Error {
  constructor() {
    super("This purchase order is not in DRAFT status.");
    this.name = "PurchaseOrderNotDraftError";
  }
}

export class PurchaseOrderNotConfirmedError extends Error {
  constructor() {
    super("This purchase order is not CONFIRMED.");
    this.name = "PurchaseOrderNotConfirmedError";
  }
}

export class PurchaseOrderNotCancellableError extends Error {
  constructor() {
    super("This purchase order can no longer be cancelled.");
    this.name = "PurchaseOrderNotCancellableError";
  }
}

export class PurchaseOrderHasNoLinesError extends Error {
  constructor() {
    super("A purchase order requires at least one line to be confirmed.");
    this.name = "PurchaseOrderHasNoLinesError";
  }
}

export class PurchaseOrderHasReceiptsError extends Error {
  constructor() {
    super("This purchase order already has receipts recorded and cannot be cancelled; close it instead.");
    this.name = "PurchaseOrderHasReceiptsError";
  }
}

export class PurchaseOrderLineNotFoundError extends Error {
  constructor() {
    super("Purchase order line was not found on this order.");
    this.name = "PurchaseOrderLineNotFoundError";
  }
}

export class PurchaseReceiptNotFoundError extends Error {
  constructor() {
    super("Purchase receipt was not found in this company.");
    this.name = "PurchaseReceiptNotFoundError";
  }
}

export class PurchaseReturnNotFoundError extends Error {
  constructor() {
    super("Purchase return was not found in this company.");
    this.name = "PurchaseReturnNotFoundError";
  }
}

export class PurchaseReceiptHasNoLinesError extends Error {
  constructor() {
    super("A receipt requires at least one line.");
    this.name = "PurchaseReceiptHasNoLinesError";
  }
}

export class PurchaseReceiptExceedsOrderedQuantityError extends Error {
  constructor() {
    super("This receipt would exceed the quantity ever ordered for this line.");
    this.name = "PurchaseReceiptExceedsOrderedQuantityError";
  }
}

export class PurchaseReturnHasNoLinesError extends Error {
  constructor() {
    super("A return requires at least one line.");
    this.name = "PurchaseReturnHasNoLinesError";
  }
}

export class PurchaseReturnExceedsReceivedQuantityError extends Error {
  constructor() {
    super("This return would exceed the quantity ever received (minus already returned) for this line.");
    this.name = "PurchaseReturnExceedsReceivedQuantityError";
  }
}

export class SupplierInvoiceNotFoundError extends Error {
  constructor() {
    super("Supplier invoice was not found in this company.");
    this.name = "SupplierInvoiceNotFoundError";
  }
}

export class SupplierInvoiceNotRecordedError extends Error {
  constructor() {
    super("This supplier invoice is not in RECORDED status.");
    this.name = "SupplierInvoiceNotRecordedError";
  }
}

export class SupplierInvoiceOrderMismatchError extends Error {
  constructor() {
    super("This purchase order does not belong to the given supplier.");
    this.name = "SupplierInvoiceOrderMismatchError";
  }
}
