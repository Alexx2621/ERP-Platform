import { Customer } from "./customer.entity";

export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findByCode(tenantId: string, companyId: string, code: string): Promise<Customer | null>;
  findByTaxId(tenantId: string, companyId: string, taxId: string): Promise<Customer | null>;
  /** `email` has no uniqueness constraint (see `Customer`'s schema docstring) — returns the oldest match, if any, the same "canonical" convention `Commerce`'s guest-checkout resolution relies on. */
  findByEmail(tenantId: string, companyId: string, email: string): Promise<Customer | null>;
  listByCompany(tenantId: string, companyId: string): Promise<Customer[]>;
  save(customer: Customer): Promise<void>;
}

export const CUSTOMER_REPOSITORY = Symbol("CUSTOMER_REPOSITORY");
