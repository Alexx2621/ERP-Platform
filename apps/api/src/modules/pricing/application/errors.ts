export class CompanyContextRequiredError extends Error {
  constructor() {
    super("This operation requires an active company context (X-Company-Id).");
    this.name = "CompanyContextRequiredError";
  }
}

export class PriceListNotFoundError extends Error {
  constructor() {
    super("Price list was not found in this company.");
    this.name = "PriceListNotFoundError";
  }
}

export class PriceListCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`A price list with code "${code}" already exists in this company.`);
    this.name = "PriceListCodeAlreadyInUseError";
  }
}

export class PriceListItemNotFoundError extends Error {
  constructor() {
    super("Price list item was not found.");
    this.name = "PriceListItemNotFoundError";
  }
}

export class PriceListItemProductNotFoundError extends Error {
  constructor() {
    super("The product was not found in this company.");
    this.name = "PriceListItemProductNotFoundError";
  }
}

export class PriceListItemProductHasVariantsError extends Error {
  constructor() {
    super("Products with variants cannot be added to a price list directly in this slice.");
    this.name = "PriceListItemProductHasVariantsError";
  }
}

export class PriceListItemAlreadyExistsError extends Error {
  constructor() {
    super("This product already has a price in this price list.");
    this.name = "PriceListItemAlreadyExistsError";
  }
}
