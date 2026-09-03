import { Inject, Injectable } from "@nestjs/common";
import { Lead, LeadStatus } from "../../domain/lead.entity";
import { LEAD_REPOSITORY, LeadRepository } from "../../domain/lead.repository";
import { LeadAlreadyTerminalError, LeadNotFoundError } from "../errors";

export interface SetLeadStatusInput {
  tenantId: string;
  companyId: string;
  id: string;
  status: Exclude<LeadStatus, "CONVERTED">;
}

/** `CONVERTED` is reachable only through `ConvertLeadUseCase` — a lead cannot be marked converted without a real linked `Customer`. */
@Injectable()
export class SetLeadStatusUseCase {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  async execute(input: SetLeadStatusInput): Promise<Lead> {
    const lead = await this.leads.findById(input.tenantId, input.id);
    if (!lead || lead.companyId !== input.companyId) {
      throw new LeadNotFoundError();
    }
    if (lead.isTerminal) {
      throw new LeadAlreadyTerminalError(lead.status);
    }
    lead.setStatus(input.status);
    await this.leads.save(lead);
    return lead;
  }
}
