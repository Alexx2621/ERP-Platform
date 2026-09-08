import { Plan } from "../domain/plan.entity";
import { PlanRepository } from "../domain/plan.repository";

export class InMemoryPlanRepository implements PlanRepository {
  private readonly byId = new Map<string, Plan>();

  async findByKey(key: string): Promise<Plan | null> {
    return [...this.byId.values()].find((plan) => plan.key === key) ?? null;
  }

  async findById(id: string): Promise<Plan | null> {
    return this.byId.get(id) ?? null;
  }

  async findAll(): Promise<Plan[]> {
    return [...this.byId.values()];
  }

  async upsert(plan: Plan): Promise<void> {
    const existing = await this.findByKey(plan.key);
    if (existing && existing.id !== plan.id) {
      this.byId.delete(existing.id);
    }
    this.byId.set(plan.id, plan);
  }
}
