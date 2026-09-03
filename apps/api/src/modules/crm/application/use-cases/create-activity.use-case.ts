import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { GetCustomerUseCase } from "../../../customers";
import { Activity, ActivityType } from "../../domain/activity.entity";
import { ACTIVITY_REPOSITORY, ActivityRepository } from "../../domain/activity.repository";
import { LEAD_REPOSITORY, LeadRepository } from "../../domain/lead.repository";
import { OPPORTUNITY_REPOSITORY, OpportunityRepository } from "../../domain/opportunity.repository";
import { ActivityMustRelateToExactlyOneError, CustomerNotFoundError, LeadNotFoundError, OpportunityNotFoundError } from "../errors";

export interface CreateActivityInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  type: ActivityType;
  subject: string;
  notes?: string;
  relatedLeadId?: string;
  relatedOpportunityId?: string;
  relatedCustomerId?: string;
  dueAt?: string;
  ownerId?: string;
}

/** Pre-validates "exactly one of lead/opportunity/customer" itself, throwing the typed `ActivityMustRelateToExactlyOneError` before ever reaching `Activity.create()`'s own domain-level guard — the same "application throws the typed, HTTP-mappable error; domain is the defense-in-depth backstop" split used throughout this codebase. */
@Injectable()
export class CreateActivityUseCase {
  constructor(
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    @Inject(OPPORTUNITY_REPOSITORY) private readonly opportunities: OpportunityRepository,
    private readonly getCustomer: GetCustomerUseCase,
  ) {}

  async execute(input: CreateActivityInput): Promise<Activity> {
    const relatedIds = [input.relatedLeadId, input.relatedOpportunityId, input.relatedCustomerId].filter((id) => Boolean(id));
    if (relatedIds.length !== 1) {
      throw new ActivityMustRelateToExactlyOneError();
    }

    if (input.relatedLeadId) {
      const lead = await this.leads.findById(input.tenantId, input.relatedLeadId);
      if (!lead || lead.companyId !== input.companyId) {
        throw new LeadNotFoundError();
      }
    }
    if (input.relatedOpportunityId) {
      const opportunity = await this.opportunities.findById(input.tenantId, input.relatedOpportunityId);
      if (!opportunity || opportunity.companyId !== input.companyId) {
        throw new OpportunityNotFoundError();
      }
    }
    if (input.relatedCustomerId) {
      const customer = await this.getCustomer.execute(input.relatedCustomerId);
      if (!customer || customer.tenantId !== input.tenantId || customer.companyId !== input.companyId) {
        throw new CustomerNotFoundError();
      }
    }

    const now = new Date();
    const activity = Activity.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      type: input.type,
      subject: input.subject,
      notes: input.notes?.trim() || null,
      relatedLeadId: input.relatedLeadId ?? null,
      relatedOpportunityId: input.relatedOpportunityId ?? null,
      relatedCustomerId: input.relatedCustomerId ?? null,
      ownerId: input.ownerId?.trim() || input.actorUserId,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    await this.activities.save(activity);
    return activity;
  }
}
