import { Module } from "@nestjs/common";
import { CreateOrganizationUseCase } from "./application/create-organization.use-case";
import { ORGANIZATION_REPOSITORY } from "./domain/organization.repository";
import { PrismaOrganizationRepository } from "./infrastructure/prisma-organization.repository";

@Module({
  providers: [
    { provide: ORGANIZATION_REPOSITORY, useClass: PrismaOrganizationRepository },
    CreateOrganizationUseCase,
  ],
  exports: [ORGANIZATION_REPOSITORY, CreateOrganizationUseCase],
})
export class OrganizationsModule {}
