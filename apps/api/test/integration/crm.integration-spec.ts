import { newId, type PrismaClient } from "@erp/database";
import { User } from "../../src/core/users/domain/user.entity";
import { PrismaUserRepository } from "../../src/core/users/infrastructure/prisma-user.repository";
import { Tenant } from "../../src/core/tenants/domain/tenant.entity";
import { PrismaTenantRepository } from "../../src/core/tenants/infrastructure/prisma-tenant.repository";
import { Organization } from "../../src/core/organizations/domain/organization.entity";
import { PrismaOrganizationRepository } from "../../src/core/organizations/infrastructure/prisma-organization.repository";
import { Company } from "../../src/core/companies/domain/company.entity";
import { PrismaCompanyRepository } from "../../src/core/companies/infrastructure/prisma-company.repository";
import { PrismaCustomerRepository } from "../../src/modules/customers/infrastructure/prisma-customer.repository";
import { CreateCustomerUseCase } from "../../src/modules/customers/application/use-cases/create-customer.use-case";
import { GetCustomerUseCase } from "../../src/modules/customers/application/use-cases/get-customer.use-case";
import { FindCustomerByEmailUseCase } from "../../src/modules/customers/application/use-cases/find-customer-by-email.use-case";
import { PrismaLeadRepository } from "../../src/modules/crm/infrastructure/prisma-lead.repository";
import { PrismaPipelineRepository } from "../../src/modules/crm/infrastructure/prisma-pipeline.repository";
import { PrismaPipelineStageRepository } from "../../src/modules/crm/infrastructure/prisma-pipeline-stage.repository";
import { PrismaOpportunityRepository } from "../../src/modules/crm/infrastructure/prisma-opportunity.repository";
import { PrismaActivityRepository } from "../../src/modules/crm/infrastructure/prisma-activity.repository";
import { CreateLeadUseCase } from "../../src/modules/crm/application/use-cases/create-lead.use-case";
import { ConvertLeadUseCase } from "../../src/modules/crm/application/use-cases/convert-lead.use-case";
import { CreatePipelineUseCase } from "../../src/modules/crm/application/use-cases/create-pipeline.use-case";
import { AddPipelineStageUseCase } from "../../src/modules/crm/application/use-cases/add-pipeline-stage.use-case";
import { CreateOpportunityUseCase } from "../../src/modules/crm/application/use-cases/create-opportunity.use-case";
import { MoveOpportunityStageUseCase } from "../../src/modules/crm/application/use-cases/move-opportunity-stage.use-case";
import { GetPipelineSummaryUseCase } from "../../src/modules/crm/application/use-cases/get-pipeline-summary.use-case";
import { CreateActivityUseCase } from "../../src/modules/crm/application/use-cases/create-activity.use-case";
import { CustomerNotFoundError } from "../../src/modules/crm/application/errors";
import type { PrismaService } from "../../src/shared/prisma/prisma.service";
import { startPostgresTestHarness, type PostgresTestHarness } from "./postgres-test-harness";

function asRepositoryClient(prisma: PrismaClient): PrismaService {
  return prisma as unknown as PrismaService;
}

function createUser(now: Date, email: string): User {
  return User.create({ id: newId(), email, displayName: "CRM Integration Owner", status: "ACTIVE", isPlatformAdmin: false, createdAt: now, updatedAt: now });
}

function createTenant(now: Date, slug: string): Tenant {
  return Tenant.create({ id: newId(), slug, name: `Tenant ${slug}`, status: "ACTIVE", version: 1, createdAt: now, updatedAt: now });
}

async function buildFixture(harness: PostgresTestHarness, slugSuffix: string) {
  const prisma = asRepositoryClient(harness.prisma);
  const users = new PrismaUserRepository(prisma);
  const tenants = new PrismaTenantRepository(prisma);
  const organizations = new PrismaOrganizationRepository(prisma);
  const companies = new PrismaCompanyRepository(prisma);

  const now = new Date("2026-09-02T00:00:00.000Z");
  const owner = createUser(now, `crm-owner-${slugSuffix}@example.com`);
  const tenant = createTenant(now, `crm-tenant-${slugSuffix}`);
  await users.save(owner);
  await tenants.save(tenant);

  const org = Organization.create({ id: newId(), tenantId: tenant.id, code: "HQ", name: "HQ", status: "ACTIVE", version: 1, createdAt: now, updatedAt: now });
  await organizations.save(org);
  const company = Company.create({
    id: newId(),
    tenantId: tenant.id,
    organizationId: org.id,
    code: "CO1",
    name: "Company One",
    status: "ACTIVE",
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  await companies.save(company);

  const otherCompany = Company.create({
    id: newId(),
    tenantId: tenant.id,
    organizationId: org.id,
    code: "CO2",
    name: "Company Two",
    status: "ACTIVE",
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  await companies.save(otherCompany);

  const customers = new PrismaCustomerRepository(prisma);
  const createCustomer = new CreateCustomerUseCase(customers);
  const getCustomer = new GetCustomerUseCase(customers);
  const findCustomerByEmail = new FindCustomerByEmailUseCase(customers);

  const leads = new PrismaLeadRepository(prisma);
  const pipelines = new PrismaPipelineRepository(prisma);
  const stages = new PrismaPipelineStageRepository(prisma);
  const opportunities = new PrismaOpportunityRepository(prisma);
  const activities = new PrismaActivityRepository(prisma);

  const createLead = new CreateLeadUseCase(leads);
  const convertLead = new ConvertLeadUseCase(leads, findCustomerByEmail, createCustomer);
  const createPipeline = new CreatePipelineUseCase(pipelines);
  const addPipelineStage = new AddPipelineStageUseCase(pipelines, stages);
  const createOpportunity = new CreateOpportunityUseCase(opportunities, pipelines, stages, leads, getCustomer);
  const moveOpportunityStage = new MoveOpportunityStageUseCase(opportunities, stages);
  const getPipelineSummary = new GetPipelineSummaryUseCase(pipelines, stages, opportunities);
  const createActivity = new CreateActivityUseCase(activities, leads, opportunities, getCustomer);

  return {
    tenant,
    company,
    otherCompany,
    ownerId: owner.id,
    createCustomer,
    createLead,
    convertLead,
    createPipeline,
    addPipelineStage,
    createOpportunity,
    moveOpportunityStage,
    getPipelineSummary,
    createActivity,
    repositories: { leads, opportunities, activities },
  };
}

describe("CRM module against PostgreSQL", () => {
  let harness: PostgresTestHarness;

  beforeAll(async () => {
    harness = await startPostgresTestHarness();
  }, 120_000);

  afterAll(async () => {
    await harness?.stop();
  });

  it("runs the full Lead -> Pipeline -> Opportunity -> Activity lifecycle against real Postgres, with real cross-module Customer calls", async () => {
    const fx = await buildFixture(harness, "lifecycle");

    const pipeline = await fx.createPipeline.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, code: "SALES", name: "Sales Pipeline" });
    const qualification = await fx.addPipelineStage.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, pipelineId: pipeline.id, name: "Qualification" });
    const won = await fx.addPipelineStage.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, pipelineId: pipeline.id, name: "Won", isWon: true });

    const lead = await fx.createLead.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      name: "Grace Hopper",
      companyName: "Hopper Analytics",
      email: "grace@hopper.dev",
    });

    const { customer, wasExistingCustomer } = await fx.convertLead.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, id: lead.id });
    expect(wasExistingCustomer).toBe(false);
    expect(customer.name).toBe("Hopper Analytics");

    const opportunity = await fx.createOpportunity.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      name: "Hopper Analytics Deal",
      pipelineId: pipeline.id,
      stageId: qualification.id,
      customerId: customer.id,
      leadId: lead.id,
      amount: "12345.6789",
      currency: "USD",
    });
    // Real Postgres round-trip precision — numeric(14,4), no trailing-zero loss.
    expect(opportunity.amount).toBe("12345.6789");

    const wonOpportunity = await fx.moveOpportunityStage.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, id: opportunity.id, stageId: won.id });
    expect(wonOpportunity.status).toBe("WON");
    expect(wonOpportunity.closedAt).not.toBeNull();

    const activity = await fx.createActivity.execute({
      tenantId: fx.tenant.id,
      companyId: fx.company.id,
      actorUserId: fx.ownerId,
      type: "NOTE",
      subject: "Deal closed won",
      relatedCustomerId: customer.id,
    });
    expect(activity.relatedCustomerId).toBe(customer.id);

    // The pipeline summary excludes the now-WON opportunity from open totals.
    const summary = await fx.getPipelineSummary.execute(fx.tenant.id, fx.company.id, pipeline.id);
    expect(summary.totalOpenAmount).toBe("0.0000");
  });

  it("ConvertLeadUseCase reuses a real existing Customer matched by email instead of creating a duplicate", async () => {
    const fx = await buildFixture(harness, "convert-reuse");
    const existing = await fx.createCustomer.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, code: "CUST-EXIST", name: "Existing Real Co", email: "repeat@example.com" });
    const lead = await fx.createLead.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, actorUserId: fx.ownerId, name: "Repeat Buyer", email: "repeat@example.com" });

    const { customer, wasExistingCustomer } = await fx.convertLead.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, id: lead.id });
    expect(customer.id).toBe(existing.id);
    expect(wasExistingCustomer).toBe(true);

    const stored = await fx.repositories.leads.findById(fx.tenant.id, lead.id);
    expect(stored?.status).toBe("CONVERTED");
    expect(stored?.convertedCustomerId).toBe(existing.id);
  });

  it("rejects an opportunity referencing a customer from another company — real cross-company rejection, not just an application filter", async () => {
    const fx = await buildFixture(harness, "cross-company");
    const foreignCustomer = await fx.createCustomer.execute({ tenantId: fx.tenant.id, companyId: fx.otherCompany.id, code: "CUST-FOREIGN", name: "Foreign Co" });
    const pipeline = await fx.createPipeline.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, code: "SALES", name: "Sales Pipeline" });
    const stage = await fx.addPipelineStage.execute({ tenantId: fx.tenant.id, companyId: fx.company.id, pipelineId: pipeline.id, name: "Qualification" });

    await expect(
      fx.createOpportunity.execute({
        tenantId: fx.tenant.id,
        companyId: fx.company.id,
        actorUserId: fx.ownerId,
        name: "Cross-company attempt",
        pipelineId: pipeline.id,
        stageId: stage.id,
        customerId: foreignCustomer.id,
        amount: "100.0000",
        currency: "USD",
      }),
    ).rejects.toThrow(CustomerNotFoundError);
  });
});
