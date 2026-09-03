import { Module } from "@nestjs/common";
import { AuthModule } from "../../core/auth";
import { TenantsModule } from "../../core/tenants";
import { AccessControlModule } from "../../core/access-control";
import { AuditModule } from "../../core/audit";
import { CustomersModule } from "../customers";
import { LEAD_REPOSITORY } from "./domain/lead.repository";
import { PIPELINE_REPOSITORY } from "./domain/pipeline.repository";
import { PIPELINE_STAGE_REPOSITORY } from "./domain/pipeline-stage.repository";
import { OPPORTUNITY_REPOSITORY } from "./domain/opportunity.repository";
import { ACTIVITY_REPOSITORY } from "./domain/activity.repository";
import { PrismaLeadRepository } from "./infrastructure/prisma-lead.repository";
import { PrismaPipelineRepository } from "./infrastructure/prisma-pipeline.repository";
import { PrismaPipelineStageRepository } from "./infrastructure/prisma-pipeline-stage.repository";
import { PrismaOpportunityRepository } from "./infrastructure/prisma-opportunity.repository";
import { PrismaActivityRepository } from "./infrastructure/prisma-activity.repository";
import { CreateLeadUseCase } from "./application/use-cases/create-lead.use-case";
import { UpdateLeadUseCase } from "./application/use-cases/update-lead.use-case";
import { SetLeadStatusUseCase } from "./application/use-cases/set-lead-status.use-case";
import { SetLeadConsentUseCase } from "./application/use-cases/set-lead-consent.use-case";
import { ConvertLeadUseCase } from "./application/use-cases/convert-lead.use-case";
import { ListLeadsUseCase } from "./application/use-cases/list-leads.use-case";
import { GetLeadUseCase } from "./application/use-cases/get-lead.use-case";
import { CreatePipelineUseCase } from "./application/use-cases/create-pipeline.use-case";
import { AddPipelineStageUseCase } from "./application/use-cases/add-pipeline-stage.use-case";
import { ListPipelinesUseCase } from "./application/use-cases/list-pipelines.use-case";
import { ListPipelineStagesUseCase } from "./application/use-cases/list-pipeline-stages.use-case";
import { SetPipelineStatusUseCase } from "./application/use-cases/set-pipeline-status.use-case";
import { CreateOpportunityUseCase } from "./application/use-cases/create-opportunity.use-case";
import { MoveOpportunityStageUseCase } from "./application/use-cases/move-opportunity-stage.use-case";
import { UpdateOpportunityUseCase } from "./application/use-cases/update-opportunity.use-case";
import { ListOpportunitiesUseCase } from "./application/use-cases/list-opportunities.use-case";
import { GetOpportunityUseCase } from "./application/use-cases/get-opportunity.use-case";
import { GetPipelineSummaryUseCase } from "./application/use-cases/get-pipeline-summary.use-case";
import { CreateActivityUseCase } from "./application/use-cases/create-activity.use-case";
import { CompleteActivityUseCase } from "./application/use-cases/complete-activity.use-case";
import { ListActivitiesUseCase } from "./application/use-cases/list-activities.use-case";
import { LeadsController } from "./presentation/leads.controller";
import { PipelinesController } from "./presentation/pipelines.controller";
import { OpportunitiesController } from "./presentation/opportunities.controller";
import { ActivitiesController } from "./presentation/activities.controller";

/**
 * Phase 9 (CRM) module — sibling of Sales/Purchasing/POS/Commerce/
 * Accounting, deliberately outside `core/` (docs/ARCHITECTURE.md
 * §5.3-§5.4). One directed, cycle-free dependency (docs/ARCHITECTURE.md
 * §6): Customers, for `ConvertLeadUseCase`/`CreateOpportunityUseCase`/
 * `CreateActivityUseCase`'s own customer-linking — Customers has no
 * knowledge CRM exists. Deliberately does **not** yet consume a real
 * Sales domain event; see docs/DECISIONS.md ADR-013 for why that is a
 * documented, honest gap rather than a silent omission.
 */
@Module({
  imports: [AuthModule, TenantsModule, AccessControlModule, AuditModule, CustomersModule],
  controllers: [LeadsController, PipelinesController, OpportunitiesController, ActivitiesController],
  providers: [
    { provide: LEAD_REPOSITORY, useClass: PrismaLeadRepository },
    { provide: PIPELINE_REPOSITORY, useClass: PrismaPipelineRepository },
    { provide: PIPELINE_STAGE_REPOSITORY, useClass: PrismaPipelineStageRepository },
    { provide: OPPORTUNITY_REPOSITORY, useClass: PrismaOpportunityRepository },
    { provide: ACTIVITY_REPOSITORY, useClass: PrismaActivityRepository },
    CreateLeadUseCase,
    UpdateLeadUseCase,
    SetLeadStatusUseCase,
    SetLeadConsentUseCase,
    ConvertLeadUseCase,
    ListLeadsUseCase,
    GetLeadUseCase,
    CreatePipelineUseCase,
    AddPipelineStageUseCase,
    ListPipelinesUseCase,
    ListPipelineStagesUseCase,
    SetPipelineStatusUseCase,
    CreateOpportunityUseCase,
    MoveOpportunityStageUseCase,
    UpdateOpportunityUseCase,
    ListOpportunitiesUseCase,
    GetOpportunityUseCase,
    GetPipelineSummaryUseCase,
    CreateActivityUseCase,
    CompleteActivityUseCase,
    ListActivitiesUseCase,
  ],
  exports: [CreateActivityUseCase],
})
export class CrmModule {}
