import { Account } from "../domain/account.entity";
import { AccountRepository, ListAccountsFilter } from "../domain/account.repository";

export class InMemoryAccountRepository implements AccountRepository {
  private readonly byId = new Map<string, Account>();

  async findById(tenantId: string, id: string): Promise<Account | null> {
    const account = this.byId.get(id);
    return account && account.tenantId === tenantId ? account : null;
  }

  async findByCode(tenantId: string, companyId: string, code: string): Promise<Account | null> {
    return (
      [...this.byId.values()].find((a) => a.tenantId === tenantId && a.companyId === companyId && a.code === code) ?? null
    );
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListAccountsFilter): Promise<Account[]> {
    return [...this.byId.values()]
      .filter(
        (a) =>
          a.tenantId === tenantId &&
          a.companyId === companyId &&
          (filter.type === undefined || a.type === filter.type) &&
          (filter.status === undefined || a.status === filter.status),
      )
      .sort((a, b) => a.code.localeCompare(b.code))
      .slice(0, filter.limit);
  }

  async save(account: Account): Promise<void> {
    this.byId.set(account.id, account);
  }
}
