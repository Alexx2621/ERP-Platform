import { Inject, Injectable } from "@nestjs/common";
import { Lead } from "../../domain/lead.entity";
import { LEAD_REPOSITORY, LeadRepository, ListLeadsFilter } from "../../domain/lead.repository";

export interface ListLeadsInput {
  tenantId: string;
  companyId: string;
  filter: ListLeadsFilter;
}

@Injectable()
export class ListLeadsUseCase {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  async execute(input: ListLeadsInput): Promise<Lead[]> {
    return this.leads.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
