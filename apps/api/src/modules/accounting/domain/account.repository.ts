import { Account, AccountType, MasterDataStatus } from "./account.entity";

export interface ListAccountsFilter {
  type?: AccountType;
  status?: MasterDataStatus;
  limit: number;
}

export interface AccountRepository {
  findById(tenantId: string, id: string): Promise<Account | null>;
  findByCode(tenantId: string, companyId: string, code: string): Promise<Account | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListAccountsFilter): Promise<Account[]>;
  save(account: Account): Promise<void>;
}

export const ACCOUNT_REPOSITORY = Symbol("ACCOUNT_REPOSITORY");
