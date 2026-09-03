import { Inject, Injectable } from "@nestjs/common";
import { Lead } from "../../domain/lead.entity";
import { LEAD_REPOSITORY, LeadRepository } from "../../domain/lead.repository";
import { LeadNotFoundError } from "../errors";

export interface UpdateLeadInput {
  tenantId: string;
  companyId: string;
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  source?: string;
}

/**
 * Every optional field uses the three-state contract this codebase
 * settled on after a real data-loss bug (Catalog, session 23): omitted ->
 * keep the current value; "" -> clear to null; a real value -> replace.
 */
@Injectable()
export class UpdateLeadUseCase {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  async execute(input: UpdateLeadInput): Promise<Lead> {
    const lead = await this.leads.findById(input.tenantId, input.id);
    if (!lead || lead.companyId !== input.companyId) {
      throw new LeadNotFoundError();
    }
    lead.update({
      name: input.name,
      companyName: input.companyName === undefined ? lead.companyName : input.companyName.trim() || null,
      email: input.email === undefined ? lead.email : input.email.trim().toLowerCase() || null,
      phone: input.phone === undefined ? lead.phone : input.phone.trim() || null,
      source: input.source === undefined ? lead.source : input.source.trim() || null,
    });
    await this.leads.save(lead);
    return lead;
  }
}
