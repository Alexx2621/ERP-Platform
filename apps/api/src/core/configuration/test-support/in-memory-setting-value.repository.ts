import type { ConfigScopeType } from "../domain/setting-definition.entity";
import { SettingValue } from "../domain/setting-value.entity";
import { SettingValueRepository } from "../domain/setting-value.repository";
import { CompanyNotFoundInTenantError } from "../application/errors";

/** Does not simulate the composite-FK company check — that is Prisma/Postgres behavior, covered by the integration suite instead, except where `knownCompanyIds` is supplied to approximate it for a use-case-level test. */
export class InMemorySettingValueRepository implements SettingValueRepository {
  private readonly byCompositeKey = new Map<string, SettingValue>();

  constructor(private readonly knownCompanyIds?: Set<string>) {}

  private key(definitionId: string, scopeType: ConfigScopeType, scopeKey: string): string {
    return `${definitionId}::${scopeType}::${scopeKey}`;
  }

  async findByScope(
    definitionId: string,
    scopeType: ConfigScopeType,
    scopeKey: string,
  ): Promise<SettingValue | null> {
    return this.byCompositeKey.get(this.key(definitionId, scopeType, scopeKey)) ?? null;
  }

  async findByDefinitionAndTenant(definitionId: string, tenantId: string): Promise<SettingValue[]> {
    return [...this.byCompositeKey.values()].filter(
      (v) => v.definitionId === definitionId && v.tenantId === tenantId,
    );
  }

  async save(value: SettingValue): Promise<void> {
    if (this.knownCompanyIds && value.companyId && !this.knownCompanyIds.has(value.companyId)) {
      throw new CompanyNotFoundInTenantError();
    }
    this.byCompositeKey.set(this.key(value.definitionId, value.scopeType, value.scopeKey), value);
  }
}
