import { Injectable } from "@nestjs/common";
import type { Customer as PrismaCustomer } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Customer } from "../domain/customer.entity";
import { CustomerRepository } from "../domain/customer.repository";

@Injectable()
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({
      where: { tenantId_companyId_code: { tenantId, companyId, code } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByTaxId(tenantId: string, companyId: string, taxId: string): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({
      where: { tenantId_companyId_taxId: { tenantId, companyId, taxId } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(tenantId: string, companyId: string): Promise<Customer[]> {
    const records = await this.prisma.customer.findMany({
      where: { tenantId, companyId },
      orderBy: { code: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(customer: Customer): Promise<void> {
    const props = customer.toProps();
    await this.prisma.customer.upsert({
      where: { id: props.id },
      create: props,
      update: {
        name: props.name,
        legalName: props.legalName,
        taxId: props.taxId,
        email: props.email,
        phone: props.phone,
        addressLine: props.addressLine,
        city: props.city,
        country: props.country,
        status: props.status,
        version: props.version,
      },
    });
  }

  private toDomain(record: PrismaCustomer): Customer {
    return Customer.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      code: record.code,
      name: record.name,
      legalName: record.legalName,
      taxId: record.taxId,
      email: record.email,
      phone: record.phone,
      addressLine: record.addressLine,
      city: record.city,
      country: record.country,
      status: record.status,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
