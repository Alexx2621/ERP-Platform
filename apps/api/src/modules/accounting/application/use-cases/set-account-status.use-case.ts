import { Inject, Injectable } from "@nestjs/common";
import { Account, MasterDataStatus } from "../../domain/account.entity";
import { ACCOUNT_REPOSITORY, AccountRepository } from "../../domain/account.repository";
import { AccountNotFoundError } from "../errors";

export interface SetAccountStatusInput {
  tenantId: string;
  companyId: string;
  id: string;
  status: MasterDataStatus;
}

@Injectable()
export class SetAccountStatusUseCase {
  constructor(@Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository) {}

  async execute(input: SetAccountStatusInput): Promise<Account> {
    const account = await this.accounts.findById(input.tenantId, input.id);
    if (!account || account.companyId !== input.companyId) {
      throw new AccountNotFoundError();
    }
    account.setStatus(input.status);
    await this.accounts.save(account);
    return account;
  }
}
