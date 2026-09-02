import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { GetWarehouseUseCase } from "../../../warehouses";
import { Storefront } from "../../domain/storefront.entity";
import { STOREFRONT_REPOSITORY, StorefrontRepository } from "../../domain/storefront.repository";
import { StorefrontCodeAlreadyInUseError, WarehouseNotFoundError } from "../errors";

export interface CreateStorefrontInput {
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  currency: string;
  domain?: string;
  defaultWarehouseId?: string | null;
}

@Injectable()
export class CreateStorefrontUseCase {
  constructor(
    @Inject(STOREFRONT_REPOSITORY) private readonly storefronts: StorefrontRepository,
    private readonly getWarehouse: GetWarehouseUseCase,
  ) {}

  async execute(input: CreateStorefrontInput): Promise<Storefront> {
    const existing = await this.storefronts.findByCode(input.code.trim().toLowerCase());
    if (existing) {
      throw new StorefrontCodeAlreadyInUseError(input.code);
    }

    let defaultWarehouseId: string | null = null;
    if (input.defaultWarehouseId) {
      const warehouse = await this.getWarehouse.execute(input.tenantId, input.defaultWarehouseId);
      if (!warehouse || warehouse.companyId !== input.companyId) {
        throw new WarehouseNotFoundError();
      }
      defaultWarehouseId = warehouse.id;
    }

    const now = new Date();
    const storefront = Storefront.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      defaultWarehouseId,
      code: input.code,
      name: input.name,
      domain: input.domain ?? null,
      currency: input.currency,
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.storefronts.save(storefront);
    return storefront;
  }
}
