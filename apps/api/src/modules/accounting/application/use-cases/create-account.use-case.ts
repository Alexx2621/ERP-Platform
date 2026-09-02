import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { Account, AccountType } from "../../domain/account.entity";
import { ACCOUNT_REPOSITORY, AccountRepository } from "../../domain/account.repository";
import { AccountCodeAlreadyInUseError, ParentAccountNotFoundError } from "../errors";

export interface CreateAccountInput {
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  type: AccountType;
  parentAccountId?: string | null;
}

@Injectable()
export class CreateAccountUseCase {
  constructor(@Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository) {}

  async execute(input: CreateAccountInput): Promise<Account> {
    const code = input.code.trim();
    const existing = await this.accounts.findByCode(input.tenantId, input.companyId, code);
    if (existing) {
      throw new AccountCodeAlreadyInUseError(code);
    }

    let parentAccountId: string | null = null;
    if (input.parentAccountId) {
      const parent = await this.accounts.findById(input.tenantId, input.parentAccountId);
      if (!parent || parent.companyId !== input.companyId) {
        throw new ParentAccountNotFoundError();
      }
      parentAccountId = parent.id;
    }

    const now = new Date();
    const account = Account.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      parentAccountId,
      code,
      name: input.name,
      type: input.type,
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.accounts.save(account);
    return account;
  }
}
