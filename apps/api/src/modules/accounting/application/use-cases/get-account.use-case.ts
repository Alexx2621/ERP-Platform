import { Inject, Injectable } from "@nestjs/common";
import { Account } from "../../domain/account.entity";
import { ACCOUNT_REPOSITORY, AccountRepository } from "../../domain/account.repository";

/** Cross-module read boundary (docs/ARCHITECTURE.md §6) — the same "no tenantId filter baked in, caller verifies" convention `Customers.GetCustomerUseCase` already established. */
@Injectable()
export class GetAccountUseCase {
  constructor(@Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository) {}

  async execute(tenantId: string, id: string): Promise<Account | null> {
    return this.accounts.findById(tenantId, id);
  }
}
