import { Inject, Injectable } from "@nestjs/common";
import {
  SETTING_DEFINITION_REPOSITORY,
  SettingDefinitionRepository,
} from "../../domain/setting-definition.repository";
import { SETTING_VALUE_REPOSITORY, SettingValueRepository } from "../../domain/setting-value.repository";
import { SettingDefinitionNotFoundError } from "../errors";

export interface GetEffectiveSettingInput {
  key: string;
  tenantId?: string;
  companyId?: string;
}

export type EffectiveSettingSource = "COMPANY" | "TENANT" | "PLATFORM" | "DEFAULT";

export interface EffectiveSetting {
  key: string;
  value: unknown;
  source: EffectiveSettingSource;
}

/**
 * Resolves the value that actually applies for a request context, falling
 * back COMPANY -> TENANT -> PLATFORM -> the definition's own default. Reading
 * through PLATFORM is safe even though writing it isn't exposed by any
 * endpoint yet (see SettingsController) — resolution is read-only.
 */
@Injectable()
export class GetEffectiveSettingUseCase {
  constructor(
    @Inject(SETTING_DEFINITION_REPOSITORY) private readonly definitions: SettingDefinitionRepository,
    @Inject(SETTING_VALUE_REPOSITORY) private readonly values: SettingValueRepository,
  ) {}

  async execute(input: GetEffectiveSettingInput): Promise<EffectiveSetting> {
    const definition = await this.definitions.findByKey(input.key);
    if (!definition) throw new SettingDefinitionNotFoundError(input.key);

    if (input.tenantId && input.companyId) {
      const companyValue = await this.values.findByScope(
        definition.id,
        "COMPANY",
        `${input.tenantId}:${input.companyId}`,
      );
      if (companyValue) return { key: definition.key, value: companyValue.value, source: "COMPANY" };
    }

    if (input.tenantId) {
      const tenantValue = await this.values.findByScope(definition.id, "TENANT", input.tenantId);
      if (tenantValue) return { key: definition.key, value: tenantValue.value, source: "TENANT" };
    }

    const platformValue = await this.values.findByScope(definition.id, "PLATFORM", "platform");
    if (platformValue) return { key: definition.key, value: platformValue.value, source: "PLATFORM" };

    return { key: definition.key, value: definition.defaultValue, source: "DEFAULT" };
  }
}
