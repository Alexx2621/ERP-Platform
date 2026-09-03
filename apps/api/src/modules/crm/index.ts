/** Public contract of the CRM module. Other modules must only import from here. */
export { Lead, type LeadProps, type LeadStatus } from "./domain/lead.entity";
export { Pipeline, type PipelineProps, type MasterDataStatus } from "./domain/pipeline.entity";
export { PipelineStage, type PipelineStageProps } from "./domain/pipeline-stage.entity";
export { Opportunity, type OpportunityProps, type OpportunityStatus } from "./domain/opportunity.entity";
export { Activity, type ActivityProps, type ActivityType } from "./domain/activity.entity";
export { CreateActivityUseCase, type CreateActivityInput } from "./application/use-cases/create-activity.use-case";
export * from "./application/errors";
export { LeadsController } from "./presentation/leads.controller";
export { PipelinesController } from "./presentation/pipelines.controller";
export { OpportunitiesController } from "./presentation/opportunities.controller";
export { ActivitiesController } from "./presentation/activities.controller";
export { CrmModule } from "./crm.module";
