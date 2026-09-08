import { Plan } from "./plan.entity";

export interface PlanRepository {
  findByKey(key: string): Promise<Plan | null>;
  findById(id: string): Promise<Plan | null>;
  findAll(): Promise<Plan[]>;
  /** Idempotent by `key` — used only by PlanCatalogSeeder, never by request handlers. */
  upsert(plan: Plan): Promise<void>;
}

export const PLAN_REPOSITORY = Symbol("PLAN_REPOSITORY");
