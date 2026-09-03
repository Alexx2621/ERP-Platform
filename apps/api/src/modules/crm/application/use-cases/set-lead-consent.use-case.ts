import { Inject, Injectable } from "@nestjs/common";
import { Lead } from "../../domain/lead.entity";
import { LEAD_REPOSITORY, LeadRepository } from "../../domain/lead.repository";
import { LeadNotFoundError } from "../errors";

export interface SetLeadConsentInput {
  tenantId: string;
  companyId: string;
  id: string;
  consentMarketing: boolean;
}

/** docs/ROADMAP.md §13 — "Consent/privacy". A lead's own marketing-consent flag, captured explicitly and independently of its lifecycle status; granting/revoking never requires the lead to be in any particular status. */
@Injectable()
export class SetLeadConsentUseCase {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  async execute(input: SetLeadConsentInput): Promise<Lead> {
    const lead = await this.leads.findById(input.tenantId, input.id);
    if (!lead || lead.companyId !== input.companyId) {
      throw new LeadNotFoundError();
    }
    lead.setConsent(input.consentMarketing, new Date());
    await this.leads.save(lead);
    return lead;
  }
}
