import { Activity } from "../domain/activity.entity";
import { ActivityRepository, ListActivitiesFilter } from "../domain/activity.repository";

export class InMemoryActivityRepository implements ActivityRepository {
  private readonly byId = new Map<string, Activity>();

  async findById(tenantId: string, id: string): Promise<Activity | null> {
    const activity = this.byId.get(id);
    return activity && activity.tenantId === tenantId ? activity : null;
  }

  async listByCompany(tenantId: string, companyId: string, filter: ListActivitiesFilter): Promise<Activity[]> {
    return [...this.byId.values()]
      .filter(
        (a) =>
          a.tenantId === tenantId &&
          a.companyId === companyId &&
          (filter.relatedLeadId === undefined || a.relatedLeadId === filter.relatedLeadId) &&
          (filter.relatedOpportunityId === undefined || a.relatedOpportunityId === filter.relatedOpportunityId) &&
          (filter.relatedCustomerId === undefined || a.relatedCustomerId === filter.relatedCustomerId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async save(activity: Activity): Promise<void> {
    this.byId.set(activity.id, activity);
  }
}
