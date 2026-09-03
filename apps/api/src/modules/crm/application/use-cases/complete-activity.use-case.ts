import { Inject, Injectable } from "@nestjs/common";
import { Activity } from "../../domain/activity.entity";
import { ACTIVITY_REPOSITORY, ActivityRepository } from "../../domain/activity.repository";
import { ActivityAlreadyCompletedError, ActivityNotFoundError } from "../errors";

export interface CompleteActivityInput {
  tenantId: string;
  companyId: string;
  id: string;
}

@Injectable()
export class CompleteActivityUseCase {
  constructor(@Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository) {}

  async execute(input: CompleteActivityInput): Promise<Activity> {
    const activity = await this.activities.findById(input.tenantId, input.id);
    if (!activity || activity.companyId !== input.companyId) {
      throw new ActivityNotFoundError();
    }
    if (activity.isCompleted) {
      throw new ActivityAlreadyCompletedError();
    }
    activity.complete(new Date());
    await this.activities.save(activity);
    return activity;
  }
}
