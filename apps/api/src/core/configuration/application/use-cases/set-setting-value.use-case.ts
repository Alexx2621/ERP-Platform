import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import type { ConfigScopeType } from "../../domain/setting-definition.entity";
import {
  SETTING_DEFINITION_REPOSITORY,
  SettingDefinitionRepository,
} from "../../domain/setting-definition.repository";
import { SETTING_VALUE_REPOSITORY, SettingValueRepository } from "../../domain/setting-value.repository";
import { SettingValue } from "../../domain/setting-value.entity";
import {
  CompanyContextRequiredError,
  InvalidSettingValueError,
  ScopeNotAllowedForSettingError,
  SettingDefinitionNotFoundError,
} from "../errors";

export interface SetSettingValueInput {
  key: string;
  scopeType: ConfigScopeType;
  tenantId: string | null;
  companyId: string | null;
  value: unknown;
}

/**
 * Domain-complete for all three scopes, but the HTTP surface
 * (SettingsController) only ever calls this with TENANT/COMPANY — see that
 * controller's docstring for why PLATFORM writes are not exposed yet.
 */
@Injectable()
export class SetSettingValueUseCase {
  constructor(
    @Inject(SETTING_DEFINITION_REPOSITORY) private readonly definitions: SettingDefinitionRepository,
    @Inject(SETTING_VALUE_REPOSITORY) private readonly values: SettingValueRepository,
  ) {}

  async execute(input: SetSettingValueInput): Promise<SettingValue> {
    const definition = await this.definitions.findByKey(input.key);
    if (!definition) throw new SettingDefinitionNotFoundError(input.key);
    if (!definition.allowsScope(input.scopeType)) {
      throw new ScopeNotAllowedForSettingError(input.key, input.scopeType);
    }
    if (input.scopeType === "COMPANY" && !input.companyId) {
      throw new CompanyContextRequiredError();
    }
    try {
      definition.assertValidValue(input.value);
    } catch {
      throw new InvalidSettingValueError(input.key, definition.dataType);
    }

    const settingValue = SettingValue.create({
      id: newId(),
      definitionId: definition.id,
      scopeType: input.scopeType,
      tenantId: input.scopeType === "PLATFORM" ? null : input.tenantId,
      companyId: input.scopeType === "COMPANY" ? input.companyId : null,
      value: input.value,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.values.save(settingValue);
    return settingValue;
  }
}
