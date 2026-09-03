import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { Lead } from "../../domain/lead.entity";
import { LEAD_REPOSITORY, LeadRepository } from "../../domain/lead.repository";

export interface CreateLeadInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  source?: string;
  ownerId?: string;
}

@Injectable()
export class CreateLeadUseCase {
  constructor(@Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository) {}

  async execute(input: CreateLeadInput): Promise<Lead> {
    const now = new Date();
    const lead = Lead.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      name: input.name,
      companyName: input.companyName?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      phone: input.phone?.trim() || null,
      source: input.source?.trim() || null,
      status: "NEW",
      // The creating user owns their own lead by default — real
      // reassignment to a different teammate is a separate, explicit
      // action (no caller-supplied arbitrary owner at creation time).
      ownerId: input.ownerId?.trim() || input.actorUserId,
      consentMarketing: false,
      consentedAt: null,
      convertedCustomerId: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.leads.save(lead);
    return lead;
  }
}
