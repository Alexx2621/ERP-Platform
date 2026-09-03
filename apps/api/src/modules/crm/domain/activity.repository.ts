import { Activity } from "./activity.entity";

export interface ListActivitiesFilter {
  relatedLeadId?: string;
  relatedOpportunityId?: string;
  relatedCustomerId?: string;
  limit: number;
}

export interface ActivityRepository {
  findById(tenantId: string, id: string): Promise<Activity | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListActivitiesFilter): Promise<Activity[]>;
  save(activity: Activity): Promise<void>;
}

export const ACTIVITY_REPOSITORY = Symbol("ACTIVITY_REPOSITORY");
