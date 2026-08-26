import { Organization } from "./organization.entity";

/** Every lookup requires tenantId; no unscoped organization query is exposed. */
export interface OrganizationRepository {
  findById(tenantId: string, id: string): Promise<Organization | null>;
  findByCode(tenantId: string, code: string): Promise<Organization | null>;
  save(organization: Organization): Promise<void>;
}

export const ORGANIZATION_REPOSITORY = Symbol("ORGANIZATION_REPOSITORY");
