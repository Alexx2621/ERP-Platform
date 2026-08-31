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

export class WarehouseCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`A warehouse with code "${code}" already exists in this company.`);
    this.name = "WarehouseCodeAlreadyInUseError";
  }
}
