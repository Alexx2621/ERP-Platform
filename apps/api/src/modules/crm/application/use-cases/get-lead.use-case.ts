import { Inject, Injectable } from "@nestjs/common";
import { Lead } from "../../domain/lead.entity";
import { LEAD_REPOSITORY, LeadRepository } from "../../domain/lead.repository";
import { LeadNotFoundError } from "../errors";

@Injectable()
export class GetLeadUseCase {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  async execute(tenantId: string, companyId: string, id: string): Promise<Lead> {
    const lead = await this.leads.findById(tenantId, id);
    if (!lead || lead.companyId !== companyId) {
      throw new LeadNotFoundError();
    }
    return lead;
  }
}
