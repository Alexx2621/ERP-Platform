import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { GetCustomerUseCase } from "../../../customers";
import { Opportunity } from "../../domain/opportunity.entity";
import { OPPORTUNITY_REPOSITORY, OpportunityRepository } from "../../domain/opportunity.repository";
import { PIPELINE_REPOSITORY, PipelineRepository } from "../../domain/pipeline.repository";
import { PIPELINE_STAGE_REPOSITORY, PipelineStageRepository } from "../../domain/pipeline-stage.repository";
import { LEAD_REPOSITORY, LeadRepository } from "../../domain/lead.repository";
import { CustomerNotFoundError, LeadNotFoundError, PipelineNotFoundError, PipelineStageNotFoundError } from "../errors";

export interface CreateOpportunityInput {
  tenantId: string;
  companyId: string;
  actorUserId: string;
  name: string;
  pipelineId: string;
  stageId: string;
  customerId?: string;
  leadId?: string;
  amount: string;
  currency: string;
  expectedCloseDate?: string;
  ownerId?: string;
}

@Injectable()
export class CreateOpportunityUseCase {
  constructor(
    @Inject(OPPORTUNITY_REPOSITORY) private readonly opportunities: OpportunityRepository,
    @Inject(PIPELINE_REPOSITORY) private readonly pipelines: PipelineRepository,
    @Inject(PIPELINE_STAGE_REPOSITORY) private readonly stages: PipelineStageRepository,
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    private readonly getCustomer: GetCustomerUseCase,
  ) {}

  async execute(input: CreateOpportunityInput): Promise<Opportunity> {
    const pipeline = await this.pipelines.findById(input.tenantId, input.pipelineId);
    if (!pipeline || pipeline.companyId !== input.companyId) {
      throw new PipelineNotFoundError();
    }
    const stage = await this.stages.findById(input.tenantId, input.stageId);
    if (!stage || stage.pipelineId !== pipeline.id) {
      throw new PipelineStageNotFoundError();
    }

    if (input.customerId) {
      const customer = await this.getCustomer.execute(input.customerId);
      if (!customer || customer.tenantId !== input.tenantId || customer.companyId !== input.companyId) {
        throw new CustomerNotFoundError();
      }
    }
    if (input.leadId) {
      const lead = await this.leads.findById(input.tenantId, input.leadId);
      if (!lead || lead.companyId !== input.companyId) {
        throw new LeadNotFoundError();
      }
    }

    const now = new Date();
    const opportunity = Opportunity.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      name: input.name,
      pipelineId: pipeline.id,
      stageId: stage.id,
      customerId: input.customerId ?? null,
      leadId: input.leadId ?? null,
      amount: input.amount,
      currency: input.currency,
      expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
      status: "OPEN",
      ownerId: input.ownerId?.trim() || input.actorUserId,
      closedAt: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.opportunities.save(opportunity);
    return opportunity;
  }
}
