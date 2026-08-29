import { Inject, Injectable } from "@nestjs/common";
import {
  SETTING_DEFINITION_REPOSITORY,
  SettingDefinitionRepository,
} from "../../domain/setting-definition.repository";
import { EffectiveSetting, GetEffectiveSettingUseCase } from "./get-effective-setting.use-case";

/**
 * Resolves every catalog definition's PLATFORM-level value (falling back to
 * the definition's own default when no PLATFORM override exists) — the
 * "current platform defaults" admin view. Deliberately omits tenantId/
 * companyId from GetEffectiveSettingUseCase's input, so its resolution
 * chain never reaches TENANT/COMPANY, only PLATFORM -> DEFAULT.
 */
@Injectable()
export class ListPlatformSettingsUseCase {
  constructor(
    @Inject(SETTING_DEFINITION_REPOSITORY) private readonly definitions: SettingDefinitionRepository,
    private readonly getEffectiveSetting: GetEffectiveSettingUseCase,
  ) {}

  async execute(): Promise<EffectiveSetting[]> {
    const catalog = await this.definitions.findAll();
    return Promise.all(catalog.map((definition) => this.getEffectiveSetting.execute({ key: definition.key })));
  }
}
