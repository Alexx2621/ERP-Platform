import { Lead, LeadStatus } from "./lead.entity";

export interface ListLeadsFilter {
  status?: LeadStatus;
  ownerId?: string;
  limit: number;
}

export interface LeadRepository {
  findById(tenantId: string, id: string): Promise<Lead | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListLeadsFilter): Promise<Lead[]>;
  save(lead: Lead): Promise<void>;
}

export const LEAD_REPOSITORY = Symbol("LEAD_REPOSITORY");
