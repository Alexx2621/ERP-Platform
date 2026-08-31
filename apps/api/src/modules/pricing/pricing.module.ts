import { Module } from "@nestjs/common";
import { AuthModule } from "../../core/auth";
import { TenantsModule } from "../../core/tenants";
import { AccessControlModule } from "../../core/access-control";
import { AuditModule } from "../../core/audit";
import { CatalogModule } from "../catalog";
import { PRICE_LIST_REPOSITORY } from "./domain/price-list.repository";
import { PRICE_LIST_ITEM_REPOSITORY } from "./domain/price-list-item.repository";
import { PrismaPriceListRepository } from "./infrastructure/prisma-price-list.repository";
import { PrismaPriceListItemRepository } from "./infrastructure/prisma-price-list-item.repository";
import { CreatePriceListUseCase } from "./application/use-cases/create-price-list.use-case";
import { UpdatePriceListUseCase } from "./application/use-cases/update-price-list.use-case";
import { ListPriceListsUseCase } from "./application/use-cases/list-price-lists.use-case";
import { SetPriceListStatusUseCase } from "./application/use-cases/set-price-list-status.use-case";
import { AddPriceListItemUseCase } from "./application/use-cases/add-price-list-item.use-case";
import { UpdatePriceListItemUseCase } from "./application/use-cases/update-price-list-item.use-case";
import { RemovePriceListItemUseCase } from "./application/use-cases/remove-price-list-item.use-case";
import { ListPriceListItemsUseCase } from "./application/use-cases/list-price-list-items.use-case";
import { PriceListsController } from "./presentation/price-lists.controller";

/**
 * Phase 2 (Master Data) module — the first to import another business
 * module (`CatalogModule`, for `GetProductUseCase`), a directed,
 * cycle-free dependency (docs/ARCHITECTURE.md §6) — Catalog has zero
 * knowledge of Pricing.
 */
@Module({
  imports: [AuthModule, TenantsModule, AccessControlModule, AuditModule, CatalogModule],
  controllers: [PriceListsController],
  providers: [
    { provide: PRICE_LIST_REPOSITORY, useClass: PrismaPriceListRepository },
    { provide: PRICE_LIST_ITEM_REPOSITORY, useClass: PrismaPriceListItemRepository },
    CreatePriceListUseCase,
    UpdatePriceListUseCase,
    ListPriceListsUseCase,
    SetPriceListStatusUseCase,
    AddPriceListItemUseCase,
    UpdatePriceListItemUseCase,
    RemovePriceListItemUseCase,
    ListPriceListItemsUseCase,
  ],
  exports: [CreatePriceListUseCase, ListPriceListsUseCase],
})
export class PricingModule {}
