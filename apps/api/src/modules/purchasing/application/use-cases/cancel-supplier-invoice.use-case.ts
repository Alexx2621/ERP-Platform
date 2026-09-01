import { Inject, Injectable } from "@nestjs/common";
import { SupplierInvoice } from "../../domain/supplier-invoice.entity";
import { SUPPLIER_INVOICE_REPOSITORY, SupplierInvoiceRepository } from "../../domain/supplier-invoice.repository";
import { SupplierInvoiceNotFoundError, SupplierInvoiceNotRecordedError } from "../errors";

export interface CancelSupplierInvoiceInput {
  tenantId: string;
  companyId: string;
  supplierInvoiceId: string;
}

@Injectable()
export class CancelSupplierInvoiceUseCase {
  constructor(@Inject(SUPPLIER_INVOICE_REPOSITORY) private readonly invoices: SupplierInvoiceRepository) {}

  async execute(input: CancelSupplierInvoiceInput): Promise<SupplierInvoice> {
    const invoice = await this.invoices.findById(input.tenantId, input.supplierInvoiceId);
    if (!invoice || invoice.companyId !== input.companyId) {
      throw new SupplierInvoiceNotFoundError();
    }
    if (invoice.status !== "RECORDED") {
      throw new SupplierInvoiceNotRecordedError();
    }

    invoice.cancel(new Date());
    await this.invoices.save(invoice);
    return invoice;
  }
}
