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

export class SupplierCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`A supplier with code "${code}" already exists in this company.`);
    this.name = "SupplierCodeAlreadyInUseError";
  }
}

export class SupplierTaxIdAlreadyInUseError extends Error {
  constructor(taxId: string) {
    super(`A supplier with tax id "${taxId}" already exists in this company.`);
    this.name = "SupplierTaxIdAlreadyInUseError";
  }
}
