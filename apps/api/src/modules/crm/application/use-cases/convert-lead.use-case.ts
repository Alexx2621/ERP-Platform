import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { CreateCustomerUseCase, Customer, FindCustomerByEmailUseCase } from "../../../customers";
import { Lead } from "../../domain/lead.entity";
import { LEAD_REPOSITORY, LeadRepository } from "../../domain/lead.repository";
import { LeadAlreadyTerminalError, LeadNotFoundError } from "../errors";

export interface ConvertLeadInput {
  tenantId: string;
  companyId: string;
  id: string;
}

export interface ConvertLeadResult {
  lead: Lead;
  customer: Customer;
  /** True when an existing `Customer` (matched by the lead's own email) was linked instead of a new one being created. */
  wasExistingCustomer: boolean;
}

/**
 * The one real moment "who is this person" transfers from CRM's own
 * `Lead` to the Customers module's real ownership (docs/ROADMAP.md §13 —
 * "Relación explícita con Party/Customers sin duplicar ownership"). Mirrors
 * Commerce's `CheckoutUseCase` guest-resolution exactly: try a real email
 * match first (`FindCustomerByEmailUseCase`) so a lead that turns out to
 * already be a known customer converges onto that same real record instead
 * of creating a duplicate; only create a fresh `Customer` when no match
 * exists. Deliberately does **not** also create an `Opportunity` — that
 * remains a separate, explicit `CreateOpportunityUseCase` call (optionally
 * passing this lead's own id), keeping this use case focused on the one
 * thing its name promises.
 */
@Injectable()
export class ConvertLeadUseCase {
  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    private readonly findCustomerByEmail: FindCustomerByEmailUseCase,
    private readonly createCustomer: CreateCustomerUseCase,
  ) {}

  async execute(input: ConvertLeadInput): Promise<ConvertLeadResult> {
    const lead = await this.leads.findById(input.tenantId, input.id);
    if (!lead || lead.companyId !== input.companyId) {
      throw new LeadNotFoundError();
    }
    if (lead.isTerminal) {
      throw new LeadAlreadyTerminalError(lead.status);
    }

    let customer: Customer | null = null;
    if (lead.email) {
      customer = await this.findCustomerByEmail.execute(input.tenantId, input.companyId, lead.email);
    }
    const wasExistingCustomer = customer !== null;
    if (!customer) {
      customer = await this.createCustomer.execute({
        tenantId: input.tenantId,
        companyId: input.companyId,
        code: `LEAD-${newId().slice(0, 8)}`,
        name: lead.companyName ?? lead.name,
        email: lead.email ?? undefined,
        phone: lead.phone ?? undefined,
      });
    }

    lead.markConverted(customer.id, new Date());
    await this.leads.save(lead);

    return { lead, customer, wasExistingCustomer };
  }
}
