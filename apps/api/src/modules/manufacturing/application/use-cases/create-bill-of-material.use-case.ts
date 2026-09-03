import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { GetProductUseCase } from "../../../catalog";
import { BillOfMaterial } from "../../domain/bill-of-material.entity";
import { BillOfMaterialComponent } from "../../domain/bill-of-material-component.entity";
import { BILL_OF_MATERIAL_REPOSITORY, BillOfMaterialRepository } from "../../domain/bill-of-material.repository";
import {
  BILL_OF_MATERIAL_COMPONENT_REPOSITORY,
  BillOfMaterialComponentRepository,
} from "../../domain/bill-of-material-component.repository";
import {
  BillOfMaterialCodeAlreadyInUseError,
  BillOfMaterialHasNoComponentsError,
  ComponentCannotBeFinishedGoodError,
  ProductNotFoundError,
  ProductNotInventoryTrackedError,
} from "../errors";
import { ResolveManufacturingProductTargetUseCase } from "./resolve-manufacturing-product-target.use-case";

export interface CreateBillOfMaterialComponentInput {
  componentProductId: string;
  componentVariantId?: string | null;
  quantityPerUnit: string;
}

export interface CreateBillOfMaterialInput {
  tenantId: string;
  companyId: string;
  productId: string;
  code: string;
  name: string;
  components: CreateBillOfMaterialComponentInput[];
}

/**
 * Creates a brand-new, immutable BOM version — never edits an existing
 * one (see `BillOfMaterial`'s own docstring). `version` is computed as one
 * more than however many BOM rows already exist for this `productId`,
 * never accepted from the caller.
 */
@Injectable()
export class CreateBillOfMaterialUseCase {
  constructor(
    @Inject(BILL_OF_MATERIAL_REPOSITORY) private readonly billsOfMaterial: BillOfMaterialRepository,
    @Inject(BILL_OF_MATERIAL_COMPONENT_REPOSITORY)
    private readonly components: BillOfMaterialComponentRepository,
    private readonly getProduct: GetProductUseCase,
    private readonly resolveComponent: ResolveManufacturingProductTargetUseCase,
  ) {}

  async execute(input: CreateBillOfMaterialInput): Promise<BillOfMaterial> {
    const code = input.code.trim();
    const existingByCode = await this.billsOfMaterial.findByCode(input.tenantId, input.companyId, code);
    if (existingByCode) {
      throw new BillOfMaterialCodeAlreadyInUseError(code);
    }

    const product = await this.getProduct.execute(input.tenantId, input.productId);
    if (!product || product.companyId !== input.companyId) {
      throw new ProductNotFoundError();
    }
    if (!product.trackInventory) {
      throw new ProductNotInventoryTrackedError();
    }

    if (input.components.length === 0) {
      throw new BillOfMaterialHasNoComponentsError();
    }

    const resolvedComponents: { componentProductId: string; componentVariantId: string | null; quantityPerUnit: string }[] =
      [];
    for (const requested of input.components) {
      if (requested.componentProductId === input.productId) {
        throw new ComponentCannotBeFinishedGoodError();
      }
      const resolved = await this.resolveComponent.execute({
        tenantId: input.tenantId,
        companyId: input.companyId,
        productId: requested.componentProductId,
        productVariantId: requested.componentVariantId,
      });
      resolvedComponents.push({
        componentProductId: requested.componentProductId,
        componentVariantId: resolved.productVariantId,
        quantityPerUnit: requested.quantityPerUnit,
      });
    }

    const existingCount = await this.billsOfMaterial.countByProduct(input.tenantId, input.companyId, input.productId);

    const now = new Date();
    const billOfMaterial = BillOfMaterial.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      productId: input.productId,
      code,
      name: input.name,
      version: existingCount + 1,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
    await this.billsOfMaterial.save(billOfMaterial);

    for (const resolved of resolvedComponents) {
      const component = BillOfMaterialComponent.create({
        id: newId(),
        tenantId: input.tenantId,
        billOfMaterialId: billOfMaterial.id,
        componentProductId: resolved.componentProductId,
        componentVariantId: resolved.componentVariantId,
        quantityPerUnit: resolved.quantityPerUnit,
        createdAt: now,
      });
      await this.components.save(component);
    }

    return billOfMaterial;
  }
}
