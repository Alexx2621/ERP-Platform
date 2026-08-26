export class CompanyCodeAlreadyInUseError extends Error {
  constructor(tenantId: string, code: string) {
    super(`Company code "${code}" already exists in tenant "${tenantId}".`);
    this.name = "CompanyCodeAlreadyInUseError";
  }
}

export class OrganizationUnavailableError extends Error {
  constructor(tenantId: string, organizationId: string) {
    super(`Organization "${organizationId}" is unavailable in tenant "${tenantId}".`);
    this.name = "OrganizationUnavailableError";
  }
}
