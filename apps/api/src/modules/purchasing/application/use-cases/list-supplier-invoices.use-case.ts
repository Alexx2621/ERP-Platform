import { Inject, Injectable } from "@nestjs/common";
import { SupplierInvoice } from "../../domain/supplier-invoice.entity";
import {
  ListSupplierInvoicesFilter,
  SUPPLIER_INVOICE_REPOSITORY,
  SupplierInvoiceRepository,
} from "../../domain/supplier-invoice.repository";

export interface ListSupplierInvoicesInput {
  tenantId: string;
  companyId: string;
  filter: ListSupplierInvoicesFilter;
}

@Injectable()
export class ListSupplierInvoicesUseCase {
  constructor(@Inject(SUPPLIER_INVOICE_REPOSITORY) private readonly invoices: SupplierInvoiceRepository) {}

  async execute(input: ListSupplierInvoicesInput): Promise<SupplierInvoice[]> {
    return this.invoices.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
