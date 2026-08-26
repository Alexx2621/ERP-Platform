export class OrganizationCodeAlreadyInUseError extends Error {
  constructor(tenantId: string, code: string) {
    super(`Organization code "${code}" already exists in tenant "${tenantId}".`);
    this.name = "OrganizationCodeAlreadyInUseError";
  }
}
