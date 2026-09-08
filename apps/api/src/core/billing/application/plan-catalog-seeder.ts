import { Inject, Injectable, Logger, Optional, OnModuleInit } from "@nestjs/common";
import { newId } from "@erp/database";
import { Plan } from "../domain/plan.entity";
import { PLAN_REPOSITORY, PlanRepository } from "../domain/plan.repository";
import { RECURRENTE_CLIENT, RecurrenteClient } from "../infrastructure/recurrente-client";
import { FOUNDATION_PLANS, validatePlanCatalog } from "./plan-catalog";

/**
 * Validates then upserts the code-owned plan catalog into the database on
 * every boot — same reentrant/observable pattern as AppCatalogSeeder/
 * PermissionCatalogSeeder/SettingCatalogSeeder (docs/ARCHITECTURE.md
 * §14.4). Never deletes existing keys.
 *
 * For each self-serve plan still missing a real Recurrente Product/Price,
 * this seeder provisions one for real through `RecurrenteClient` — never
 * fabricates a local id (MASTER_SPEC §90). `RecurrenteClient` is injected
 * as optional: when `RECURRENTE_SECRET_KEY` is unset (CI, most local dev,
 * tests), the local `Plan` catalog still seeds correctly, just without
 * provider ids yet — the same "fail closed with an explanatory log line,
 * never silently fake success" pattern already used by `EmailModule`.
 * Re-running this against an already-provisioned plan is a genuine no-op:
 * it never re-creates a Recurrente Product for a plan that already has
 * one recorded.
 */
@Injectable()
export class PlanCatalogSeeder implements OnModuleInit {
  private readonly logger = new Logger(PlanCatalogSeeder.name);

  constructor(
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Optional() @Inject(RECURRENTE_CLIENT) private readonly recurrente: RecurrenteClient | undefined,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seed();
  }

  /** Exposed for explicit ordering by future consumers, mirroring AppCatalogSeeder.seed(). Idempotent. */
  async seed(): Promise<void> {
    validatePlanCatalog(FOUNDATION_PLANS);

    let provisioned = 0;
    for (const manifest of FOUNDATION_PLANS) {
      const now = new Date();
      const existing = await this.plans.findByKey(manifest.key);

      let recurrenteProductId = existing?.recurrenteProductId ?? null;
      let recurrentePriceId = existing?.recurrentePriceId ?? null;

      if (manifest.isSelfServe && !recurrentePriceId && this.recurrente) {
        const result = await this.recurrente.createRecurringProduct({
          name: manifest.name,
          description: manifest.description,
          amountInCents: this.toCents(manifest.basePriceAmount),
          currency: manifest.currency as "GTQ" | "USD",
          billingInterval: "month",
        });
        recurrenteProductId = result.productId;
        recurrentePriceId = result.priceId;
        provisioned += 1;
      }

      await this.plans.upsert(
        Plan.create({
          id: existing?.id ?? newId(),
          key: manifest.key,
          name: manifest.name,
          description: manifest.description,
          currency: manifest.currency,
          basePriceAmount: manifest.basePriceAmount,
          perUserPriceAmount: manifest.perUserPriceAmount,
          includesAppKeys: manifest.includesAppKeys,
          isSelfServe: manifest.isSelfServe,
          recurrenteProductId,
          recurrentePriceId,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }),
      );
    }

    if (this.recurrente) {
      this.logger.log(`Plan catalog seeded (${FOUNDATION_PLANS.length} plans, ${provisioned} newly provisioned in Recurrente).`);
    } else {
      this.logger.warn(
        `Plan catalog seeded (${FOUNDATION_PLANS.length} plans) — RECURRENTE_SECRET_KEY not set, no Recurrente Product/Price attached.`,
      );
    }
  }

  private toCents(decimalAmount: string): number {
    return Math.round(Number.parseFloat(decimalAmount) * 100);
  }
}
