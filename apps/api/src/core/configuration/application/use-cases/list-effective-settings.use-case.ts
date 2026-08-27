import { Inject, Injectable } from "@nestjs/common";
import {
  SETTING_DEFINITION_REPOSITORY,
  SettingDefinitionRepository,
} from "../../domain/setting-definition.repository";
import { EffectiveSetting, GetEffectiveSettingUseCase } from "./get-effective-setting.use-case";

export interface ListEffectiveSettingsInput {
  tenantId: string;
  companyId?: string;
}

/** Resolves every catalog definition's effective value for one tenant/company context — the "current settings" admin view. */
@Injectable()
export class ListEffectiveSettingsUseCase {
  constructor(
    @Inject(SETTING_DEFINITION_REPOSITORY) private readonly definitions: SettingDefinitionRepository,
    private readonly getEffectiveSetting: GetEffectiveSettingUseCase,
  ) {}

  async execute(input: ListEffectiveSettingsInput): Promise<EffectiveSetting[]> {
    const catalog = await this.definitions.findAll();
    return Promise.all(
      catalog.map((definition) =>
        this.getEffectiveSetting.execute({
          key: definition.key,
          tenantId: input.tenantId,
          companyId: input.companyId,
        }),
      ),
    );
  }
}
