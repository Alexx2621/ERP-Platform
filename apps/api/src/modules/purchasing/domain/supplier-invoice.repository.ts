import { SupplierInvoice } from "./supplier-invoice.entity";

export interface ListSupplierInvoicesFilter {
  purchaseOrderId?: string;
  supplierId?: string;
  limit: number;
}

export interface SupplierInvoiceRepository {
  findById(tenantId: string, id: string): Promise<SupplierInvoice | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListSupplierInvoicesFilter): Promise<SupplierInvoice[]>;
  save(invoice: SupplierInvoice): Promise<void>;
}

export const SUPPLIER_INVOICE_REPOSITORY = Symbol("SUPPLIER_INVOICE_REPOSITORY");
