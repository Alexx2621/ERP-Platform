export class CompanyContextRequiredError extends Error {
  constructor() {
    super("This operation requires an active company context (X-Company-Id).");
    this.name = "CompanyContextRequiredError";
  }
}

export class UnitOfMeasureNotFoundError extends Error {
  constructor() {
    super("Unit of measure was not found in this company.");
    this.name = "UnitOfMeasureNotFoundError";
  }
}

export class UnitOfMeasureCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`A unit of measure with code "${code}" already exists in this company.`);
    this.name = "UnitOfMeasureCodeAlreadyInUseError";
  }
}

export class CategoryNotFoundError extends Error {
  constructor() {
    super("Category was not found in this company.");
    this.name = "CategoryNotFoundError";
  }
}

export class CategoryCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`A category with code "${code}" already exists in this company.`);
    this.name = "CategoryCodeAlreadyInUseError";
  }
}

export class CategoryParentNotFoundError extends Error {
  constructor() {
    super("The parent category was not found in this company.");
    this.name = "CategoryParentNotFoundError";
  }
}

export class BrandNotFoundError extends Error {
  constructor() {
    super("Brand was not found in this company.");
    this.name = "BrandNotFoundError";
  }
}

export class BrandCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`A brand with code "${code}" already exists in this company.`);
    this.name = "BrandCodeAlreadyInUseError";
  }
}

export class ProductNotFoundError extends Error {
  constructor() {
    super("Product was not found in this company.");
    this.name = "ProductNotFoundError";
  }
}

export class ProductCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`A product with code "${code}" already exists in this company.`);
    this.name = "ProductCodeAlreadyInUseError";
  }
}

export class ProductBarcodeAlreadyInUseError extends Error {
  constructor(barcode: string) {
    super(`A product with barcode "${barcode}" already exists in this company.`);
    this.name = "ProductBarcodeAlreadyInUseError";
  }
}

export class ProductUnitOfMeasureNotFoundError extends Error {
  constructor() {
    super("The unit of measure was not found in this company.");
    this.name = "ProductUnitOfMeasureNotFoundError";
  }
}

export class ProductCategoryNotFoundError extends Error {
  constructor() {
    super("The category was not found in this company.");
    this.name = "ProductCategoryNotFoundError";
  }
}

export class ProductBrandNotFoundError extends Error {
  constructor() {
    super("The brand was not found in this company.");
    this.name = "ProductBrandNotFoundError";
  }
}

export class ProductDoesNotSupportVariantsError extends Error {
  constructor() {
    super("This product does not have hasVariants enabled.");
    this.name = "ProductDoesNotSupportVariantsError";
  }
}

export class ProductVariantNotFoundError extends Error {
  constructor() {
    super("Product variant was not found.");
    this.name = "ProductVariantNotFoundError";
  }
}

export class ProductVariantSkuAlreadyInUseError extends Error {
  constructor(sku: string) {
    super(`A variant with SKU "${sku}" already exists.`);
    this.name = "ProductVariantSkuAlreadyInUseError";
  }
}
