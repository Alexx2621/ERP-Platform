import { Inject, Injectable } from "@nestjs/common";
import { Account } from "../../domain/account.entity";
import { ACCOUNT_REPOSITORY, AccountRepository } from "../../domain/account.repository";
import { AccountNotFoundError } from "../errors";

export interface UpdateAccountInput {
  tenantId: string;
  companyId: string;
  id: string;
  name: string;
}

/** Only `name` is editable after creation — `type`/`code` are load-bearing for every posting already made against this account and are deliberately immutable, the same "a snapshotted/structural fact is never silently rewritten" reasoning already applied elsewhere in this codebase. */
@Injectable()
export class UpdateAccountUseCase {
  constructor(@Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository) {}

  async execute(input: UpdateAccountInput): Promise<Account> {
    const account = await this.accounts.findById(input.tenantId, input.id);
    if (!account || account.companyId !== input.companyId) {
      throw new AccountNotFoundError();
    }
    account.rename(input.name);
    await this.accounts.save(account);
    return account;
  }
}
