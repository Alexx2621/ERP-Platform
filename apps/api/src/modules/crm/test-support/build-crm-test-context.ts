import { InMemoryCustomerRepository } from "../../customers/test-support/in-memory-customer.repository";
import { CreateCustomerUseCase } from "../../customers/application/use-cases/create-customer.use-case";
import { GetCustomerUseCase } from "../../customers/application/use-cases/get-customer.use-case";
import { FindCustomerByEmailUseCase } from "../../customers/application/use-cases/find-customer-by-email.use-case";
import { InMemoryLeadRepository } from "./in-memory-lead.repository";
import { InMemoryPipelineRepository } from "./in-memory-pipeline.repository";
import { InMemoryPipelineStageRepository } from "./in-memory-pipeline-stage.repository";
import { InMemoryOpportunityRepository } from "./in-memory-opportunity.repository";
import { InMemoryActivityRepository } from "./in-memory-activity.repository";
import { CreateLeadUseCase } from "../application/use-cases/create-lead.use-case";
import { UpdateLeadUseCase } from "../application/use-cases/update-lead.use-case";
import { SetLeadStatusUseCase } from "../application/use-cases/set-lead-status.use-case";
import { SetLeadConsentUseCase } from "../application/use-cases/set-lead-consent.use-case";
import { ConvertLeadUseCase } from "../application/use-cases/convert-lead.use-case";
import { ListLeadsUseCase } from "../application/use-cases/list-leads.use-case";
import { GetLeadUseCase } from "../application/use-cases/get-lead.use-case";
import { CreatePipelineUseCase } from "../application/use-cases/create-pipeline.use-case";
import { AddPipelineStageUseCase } from "../application/use-cases/add-pipeline-stage.use-case";
import { ListPipelinesUseCase } from "../application/use-cases/list-pipelines.use-case";
import { ListPipelineStagesUseCase } from "../application/use-cases/list-pipeline-stages.use-case";
import { SetPipelineStatusUseCase } from "../application/use-cases/set-pipeline-status.use-case";
import { CreateOpportunityUseCase } from "../application/use-cases/create-opportunity.use-case";
import { MoveOpportunityStageUseCase } from "../application/use-cases/move-opportunity-stage.use-case";
import { UpdateOpportunityUseCase } from "../application/use-cases/update-opportunity.use-case";
import { ListOpportunitiesUseCase } from "../application/use-cases/list-opportunities.use-case";
import { GetOpportunityUseCase } from "../application/use-cases/get-opportunity.use-case";
import { GetPipelineSummaryUseCase } from "../application/use-cases/get-pipeline-summary.use-case";
import { CreateActivityUseCase } from "../application/use-cases/create-activity.use-case";
import { CompleteActivityUseCase } from "../application/use-cases/complete-activity.use-case";
import { ListActivitiesUseCase } from "../application/use-cases/list-activities.use-case";

export const TENANT_ID = "tenant-1";
export const COMPANY_ID = "company-1";
export const OTHER_COMPANY_ID = "company-2";
export const ACTOR_USER_ID = "user-1";

/**
 * Shared fixture builder for CRM application-layer tests, mirroring the
 * project's established `buildSalesTestContext()`/`buildAccountingTestContext()`
 * pattern. CRM has exactly one real cross-module dependency — Customers,
 * for `ConvertLeadUseCase`/`CreateOpportunityUseCase`/`CreateActivityUseCase`'s
 * own customer-linking — wired here with real in-memory Customers use
 * cases, never a mock.
 */
export async function buildCrmTestContext() {
  const customers = new InMemoryCustomerRepository();
  const createCustomer = new CreateCustomerUseCase(customers);
  const getCustomer = new GetCustomerUseCase(customers);
  const findCustomerByEmail = new FindCustomerByEmailUseCase(customers);

  const customer = await createCustomer.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, code: "CUST-1", name: "Acme Corp" });

  const leads = new InMemoryLeadRepository();
  const pipelines = new InMemoryPipelineRepository();
  const stages = new InMemoryPipelineStageRepository();
  const opportunities = new InMemoryOpportunityRepository();
  const activities = new InMemoryActivityRepository();

  const createLead = new CreateLeadUseCase(leads);
  const updateLead = new UpdateLeadUseCase(leads);
  const setLeadStatus = new SetLeadStatusUseCase(leads);
  const setLeadConsent = new SetLeadConsentUseCase(leads);
  const convertLead = new ConvertLeadUseCase(leads, findCustomerByEmail, createCustomer);
  const listLeads = new ListLeadsUseCase(leads);
  const getLead = new GetLeadUseCase(leads);

  const createPipeline = new CreatePipelineUseCase(pipelines);
  const addPipelineStage = new AddPipelineStageUseCase(pipelines, stages);
  const listPipelines = new ListPipelinesUseCase(pipelines);
  const listPipelineStages = new ListPipelineStagesUseCase(pipelines, stages);
  const setPipelineStatus = new SetPipelineStatusUseCase(pipelines);

  const createOpportunity = new CreateOpportunityUseCase(opportunities, pipelines, stages, leads, getCustomer);
  const moveOpportunityStage = new MoveOpportunityStageUseCase(opportunities, stages);
  const updateOpportunity = new UpdateOpportunityUseCase(opportunities);
  const listOpportunities = new ListOpportunitiesUseCase(opportunities);
  const getOpportunity = new GetOpportunityUseCase(opportunities);
  const getPipelineSummary = new GetPipelineSummaryUseCase(pipelines, stages, opportunities);

  const createActivity = new CreateActivityUseCase(activities, leads, opportunities, getCustomer);
  const completeActivity = new CompleteActivityUseCase(activities);
  const listActivities = new ListActivitiesUseCase(activities);

  const pipeline = await createPipeline.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, code: "SALES", name: "Sales Pipeline" });
  const qualificationStage = await addPipelineStage.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, pipelineId: pipeline.id, name: "Qualification" });
  const negotiationStage = await addPipelineStage.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, pipelineId: pipeline.id, name: "Negotiation" });
  const wonStage = await addPipelineStage.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, pipelineId: pipeline.id, name: "Won", isWon: true });
  const lostStage = await addPipelineStage.execute({ tenantId: TENANT_ID, companyId: COMPANY_ID, pipelineId: pipeline.id, name: "Lost", isLost: true });

  return {
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    otherCompanyId: OTHER_COMPANY_ID,
    actorUserId: ACTOR_USER_ID,
    customer,
    createCustomer,
    getCustomer,
    findCustomerByEmail,
    pipeline,
    qualificationStage,
    negotiationStage,
    wonStage,
    lostStage,
    createLead,
    updateLead,
    setLeadStatus,
    setLeadConsent,
    convertLead,
    listLeads,
    getLead,
    createPipeline,
    addPipelineStage,
    listPipelines,
    listPipelineStages,
    setPipelineStatus,
    createOpportunity,
    moveOpportunityStage,
    updateOpportunity,
    listOpportunities,
    getOpportunity,
    getPipelineSummary,
    createActivity,
    completeActivity,
    listActivities,
    repositories: { leads, pipelines, stages, opportunities, activities, customers },
  };
}

export type CrmTestContext = Awaited<ReturnType<typeof buildCrmTestContext>>;
