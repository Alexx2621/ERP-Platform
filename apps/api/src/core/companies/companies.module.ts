import { Module } from "@nestjs/common";
import { OrganizationsModule } from "../organizations";
import { CreateCompanyUseCase } from "./application/create-company.use-case";
import { ListCompaniesUseCase } from "./application/list-companies.use-case";
import { COMPANY_REPOSITORY } from "./domain/company.repository";
import { PrismaCompanyRepository } from "./infrastructure/prisma-company.repository";

@Module({
  imports: [OrganizationsModule],
  providers: [
    { provide: COMPANY_REPOSITORY, useClass: PrismaCompanyRepository },
    CreateCompanyUseCase,
    ListCompaniesUseCase,
  ],
  exports: [COMPANY_REPOSITORY, CreateCompanyUseCase, ListCompaniesUseCase],
})
export class CompaniesModule {}
