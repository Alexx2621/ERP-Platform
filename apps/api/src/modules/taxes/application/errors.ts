export class CompanyContextRequiredError extends Error {
  constructor() {
    super("This operation requires an active company context (X-Company-Id).");
    this.name = "CompanyContextRequiredError";
  }
}

export class TaxNotFoundError extends Error {
  constructor() {
    super("Tax was not found in this company.");
    this.name = "TaxNotFoundError";
  }
}

export class TaxCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`A tax with code "${code}" already exists in this company.`);
    this.name = "TaxCodeAlreadyInUseError";
  }
}
