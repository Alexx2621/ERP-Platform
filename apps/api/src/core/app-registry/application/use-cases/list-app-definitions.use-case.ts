import { Inject, Injectable } from "@nestjs/common";
import { AppDefinition } from "../../domain/app-definition.entity";
import { APP_DEFINITION_REPOSITORY, AppDefinitionRepository } from "../../domain/app-definition.repository";

@Injectable()
export class ListAppDefinitionsUseCase {
  constructor(@Inject(APP_DEFINITION_REPOSITORY) private readonly definitions: AppDefinitionRepository) {}

  async execute(): Promise<AppDefinition[]> {
    return this.definitions.findAll();
  }
}
