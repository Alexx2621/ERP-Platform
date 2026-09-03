export class CompanyContextRequiredError extends Error {
  constructor() {
    super("This operation requires an active company context (X-Company-Id).");
    this.name = "CompanyContextRequiredError";
  }
}

export class LeadNotFoundError extends Error {
  constructor() {
    super("Lead was not found in this company.");
    this.name = "LeadNotFoundError";
  }
}

export class LeadAlreadyTerminalError extends Error {
  constructor(status: string) {
    super(`This lead is already ${status}; it cannot change status or be converted again.`);
    this.name = "LeadAlreadyTerminalError";
  }
}

export class PipelineNotFoundError extends Error {
  constructor() {
    super("Pipeline was not found in this company.");
    this.name = "PipelineNotFoundError";
  }
}

export class PipelineCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`Pipeline code "${code}" is already in use in this company.`);
    this.name = "PipelineCodeAlreadyInUseError";
  }
}

export class PipelineStageNotFoundError extends Error {
  constructor() {
    super("Pipeline stage was not found for this pipeline.");
    this.name = "PipelineStageNotFoundError";
  }
}

export class OpportunityNotFoundError extends Error {
  constructor() {
    super("Opportunity was not found in this company.");
    this.name = "OpportunityNotFoundError";
  }
}

export class OpportunityNotOpenError extends Error {
  constructor(status: string) {
    super(`This opportunity is already ${status}; it cannot be moved or updated.`);
    this.name = "OpportunityNotOpenError";
  }
}

export class ActivityNotFoundError extends Error {
  constructor() {
    super("Activity was not found in this company.");
    this.name = "ActivityNotFoundError";
  }
}

export class ActivityAlreadyCompletedError extends Error {
  constructor() {
    super("This activity is already completed.");
    this.name = "ActivityAlreadyCompletedError";
  }
}

export class ActivityMustRelateToExactlyOneError extends Error {
  constructor() {
    super("An activity must relate to exactly one of a lead, an opportunity, or a customer.");
    this.name = "ActivityMustRelateToExactlyOneError";
  }
}

export class CustomerNotFoundError extends Error {
  constructor() {
    super("Customer was not found in this company.");
    this.name = "CustomerNotFoundError";
  }
}
