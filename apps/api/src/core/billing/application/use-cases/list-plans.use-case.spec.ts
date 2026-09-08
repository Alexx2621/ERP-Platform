import { newId } from "@erp/database";
import { Plan } from "../../domain/plan.entity";
import { InMemoryPlanRepository } from "../../test-support/in-memory-plan.repository";
import { ListPlansUseCase } from "./list-plans.use-case";

describe("ListPlansUseCase", () => {
  it("returns every plan in the catalog", async () => {
    const plans = new InMemoryPlanRepository();
    const now = new Date();
    await plans.upsert(
      Plan.create({ id: newId(), key: "starter", name: "Starter", description: "d", currency: "GTQ", basePriceAmount: "299.0000", perUserPriceAmount: "29.0000", includesAppKeys: [], isSelfServe: true, recurrenteProductId: null, recurrentePriceId: null, createdAt: now, updatedAt: now }),
    );
    const useCase = new ListPlansUseCase(plans);
    const result = await useCase.execute();
    expect(result.map((p) => p.key)).toEqual(["starter"]);
  });

  it("returns an empty array when nothing has been seeded", async () => {
    const useCase = new ListPlansUseCase(new InMemoryPlanRepository());
    expect(await useCase.execute()).toEqual([]);
  });
});
