import { Inject, Injectable } from "@nestjs/common";
import { SettingDefinition } from "../../domain/setting-definition.entity";
import {
  SETTING_DEFINITION_REPOSITORY,
  SettingDefinitionRepository,
} from "../../domain/setting-definition.repository";

@Injectable()
export class ListSettingDefinitionsUseCase {
  constructor(
    @Inject(SETTING_DEFINITION_REPOSITORY) private readonly definitions: SettingDefinitionRepository,
  ) {}

  execute(): Promise<SettingDefinition[]> {
    return this.definitions.findAll();
  }
}
