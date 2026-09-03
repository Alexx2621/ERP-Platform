export class CompanyContextRequiredError extends Error {
  constructor() {
    super("This operation requires an active company context (X-Company-Id).");
    this.name = "CompanyContextRequiredError";
  }
}

export class ProductNotFoundError extends Error {
  constructor() {
    super("Product was not found in this company.");
    this.name = "ProductNotFoundError";
  }
}

export class ProductNotInventoryTrackedError extends Error {
  constructor() {
    super("This product does not track inventory and cannot be used in Manufacturing.");
    this.name = "ProductNotInventoryTrackedError";
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

export class BillOfMaterialCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`Bill of material code "${code}" is already in use in this company.`);
    this.name = "BillOfMaterialCodeAlreadyInUseError";
  }
}

export class ComponentCannotBeFinishedGoodError extends Error {
  constructor() {
    super("A bill of material's finished good cannot also be one of its own components.");
    this.name = "ComponentCannotBeFinishedGoodError";
  }
}

export class BillOfMaterialHasNoComponentsError extends Error {
  constructor() {
    super("A bill of material requires at least one component.");
    this.name = "BillOfMaterialHasNoComponentsError";
  }
}

export class WarehouseNotFoundError extends Error {
  constructor() {
    super("Warehouse was not found in this company.");
    this.name = "WarehouseNotFoundError";
  }
}

export class BillOfMaterialNotFoundError extends Error {
  constructor() {
    super("Bill of material was not found in this company.");
    this.name = "BillOfMaterialNotFoundError";
  }
}

export class BillOfMaterialNotActiveError extends Error {
  constructor() {
    super("This bill of material is not ACTIVE.");
    this.name = "BillOfMaterialNotActiveError";
  }
}

export class ProductionOrderNotFoundError extends Error {
  constructor() {
    super("Production order was not found in this company.");
    this.name = "ProductionOrderNotFoundError";
  }
}

export class ProductionOrderNotDraftError extends Error {
  constructor() {
    super("This production order is not in DRAFT status.");
    this.name = "ProductionOrderNotDraftError";
  }
}

export class ProductionOrderNotConfirmedError extends Error {
  constructor() {
    super("This production order is not CONFIRMED.");
    this.name = "ProductionOrderNotConfirmedError";
  }
}

export class ProductionOrderNotOpenError extends Error {
  constructor() {
    super("This production order is CLOSED or CANCELLED and can no longer be modified.");
    this.name = "ProductionOrderNotOpenError";
  }
}

export class ProductionOrderNotCancellableError extends Error {
  constructor() {
    super("This production order can no longer be cancelled.");
    this.name = "ProductionOrderNotCancellableError";
  }
}

export class ProductionOrderHasActivityError extends Error {
  constructor() {
    super(
      "This production order already has material movements or finished-goods receipts and cannot be cancelled; close it instead.",
    );
    this.name = "ProductionOrderHasActivityError";
  }
}

export class ProductionOrderMaterialNotFoundError extends Error {
  constructor() {
    super("Production order material was not found on this order.");
    this.name = "ProductionOrderMaterialNotFoundError";
  }
}

export class ProductionOrderMaterialIssueExceedsRequiredQuantityError extends Error {
  constructor() {
    super("This issue would exceed the quantity ever required for this material.");
    this.name = "ProductionOrderMaterialIssueExceedsRequiredQuantityError";
  }
}

export class ProductionOrderMaterialReturnExceedsIssuedQuantityError extends Error {
  constructor() {
    super("This return would exceed the quantity ever issued (minus already returned) for this material.");
    this.name = "ProductionOrderMaterialReturnExceedsIssuedQuantityError";
  }
}

export class ProductionOrderOperationNotFoundError extends Error {
  constructor() {
    super("Production order operation was not found on this order.");
    this.name = "ProductionOrderOperationNotFoundError";
  }
}

export class ProductionOrderFinishedGoodsReceiptExceedsPlannedQuantityError extends Error {
  constructor() {
    super("This receipt would exceed the quantity ever planned for this order.");
    this.name = "ProductionOrderFinishedGoodsReceiptExceedsPlannedQuantityError";
  }
}
