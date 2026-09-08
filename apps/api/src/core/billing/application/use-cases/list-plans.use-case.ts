import { Inject, Injectable } from "@nestjs/common";
import { Plan } from "../../domain/plan.entity";
import { PLAN_REPOSITORY, PlanRepository } from "../../domain/plan.repository";

/** The real pricing catalog a public "planes y precios" page reads (docs/DECISIONS.md ADR-016). */
@Injectable()
export class ListPlansUseCase {
  constructor(@Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository) {}

  async execute(): Promise<Plan[]> {
    return this.plans.findAll();
  }
}
