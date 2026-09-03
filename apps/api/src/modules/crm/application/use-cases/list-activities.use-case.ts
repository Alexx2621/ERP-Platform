import { Inject, Injectable } from "@nestjs/common";
import { Activity } from "../../domain/activity.entity";
import { ACTIVITY_REPOSITORY, ActivityRepository, ListActivitiesFilter } from "../../domain/activity.repository";

export interface ListActivitiesInput {
  tenantId: string;
  companyId: string;
  filter: ListActivitiesFilter;
}

@Injectable()
export class ListActivitiesUseCase {
  constructor(@Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository) {}

  async execute(input: ListActivitiesInput): Promise<Activity[]> {
    return this.activities.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
