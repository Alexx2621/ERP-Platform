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

export class CustomerCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`A customer with code "${code}" already exists in this company.`);
    this.name = "CustomerCodeAlreadyInUseError";
  }
}

export class CustomerTaxIdAlreadyInUseError extends Error {
  constructor(taxId: string) {
    super(`A customer with tax id "${taxId}" already exists in this company.`);
    this.name = "CustomerTaxIdAlreadyInUseError";
  }
}
