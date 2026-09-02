import { Inject, Injectable } from "@nestjs/common";
import { Account } from "../../domain/account.entity";
import { ACCOUNT_REPOSITORY, AccountRepository, ListAccountsFilter } from "../../domain/account.repository";

export interface ListAccountsInput {
  tenantId: string;
  companyId: string;
  filter: ListAccountsFilter;
}

@Injectable()
export class ListAccountsUseCase {
  constructor(@Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository) {}

  async execute(input: ListAccountsInput): Promise<Account[]> {
    return this.accounts.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
