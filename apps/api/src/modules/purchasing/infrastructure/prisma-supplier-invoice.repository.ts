import { Injectable } from "@nestjs/common";
import type { SupplierInvoice as PrismaSupplierInvoice } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { SupplierInvoice } from "../domain/supplier-invoice.entity";
import { ListSupplierInvoicesFilter, SupplierInvoiceRepository } from "../domain/supplier-invoice.repository";

@Injectable()
export class PrismaSupplierInvoiceRepository implements SupplierInvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<SupplierInvoice | null> {
    const record = await this.prisma.supplierInvoice.findUnique({ where: { tenantId_id: { tenantId, id } } });
    return record ? this.toDomain(record) : null;
  }

  async listByCompany(
    tenantId: string,
    companyId: string,
    filter: ListSupplierInvoicesFilter,
  ): Promise<SupplierInvoice[]> {
    const records = await this.prisma.supplierInvoice.findMany({
      where: { tenantId, companyId, purchaseOrderId: filter.purchaseOrderId, supplierId: filter.supplierId },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(invoice: SupplierInvoice): Promise<void> {
    const props = invoice.toProps();
    await this.prisma.supplierInvoice.upsert({
      where: { tenantId_id: { tenantId: props.tenantId, id: props.id } },
      create: props,
      update: { status: props.status, cancelledAt: props.cancelledAt, updatedAt: props.updatedAt },
    });
  }

  private toDomain(record: PrismaSupplierInvoice): SupplierInvoice {
    return SupplierInvoice.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      supplierId: record.supplierId,
      purchaseOrderId: record.purchaseOrderId,
      invoiceNumber: record.invoiceNumber,
      amount: record.amount.toFixed(4),
      currency: record.currency,
      issueDate: record.issueDate,
      dueDate: record.dueDate,
      status: record.status,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      cancelledAt: record.cancelledAt,
    });
  }
}
