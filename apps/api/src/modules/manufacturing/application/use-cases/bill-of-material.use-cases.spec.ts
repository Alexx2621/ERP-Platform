import { buildManufacturingTestContext } from "../../test-support/build-manufacturing-test-context";
import {
  BillOfMaterialCodeAlreadyInUseError,
  BillOfMaterialHasNoComponentsError,
  BillOfMaterialNotFoundError,
  ComponentCannotBeFinishedGoodError,
  ProductNotFoundError,
  ProductNotInventoryTrackedError,
} from "../errors";

describe("BillOfMaterial use cases", () => {
  it("creates a BOM with its components, version 1", async () => {
    const ctx = await buildManufacturingTestContext();
    const bom = await ctx.createBillOfMaterial.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productId: ctx.finishedGood.id,
      code: "BOM-CHAIR",
      name: "Silla de madera",
      components: [
        { componentProductId: ctx.componentA.id, quantityPerUnit: "2.0000" },
        { componentProductId: ctx.componentB.id, quantityPerUnit: "8.0000" },
      ],
    });
    expect(bom.version).toBe(1);
    expect(bom.status).toBe("ACTIVE");

    const components = await ctx.listBillOfMaterialComponents.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      billOfMaterialId: bom.id,
    });
    expect(components).toHaveLength(2);
  });

  it("assigns the next version for a second BOM of the same product", async () => {
    const ctx = await buildManufacturingTestContext();
    await ctx.createBillOfMaterial.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productId: ctx.finishedGood.id,
      code: "BOM-CHAIR-V1",
      name: "Silla v1",
      components: [{ componentProductId: ctx.componentA.id, quantityPerUnit: "2.0000" }],
    });
    const second = await ctx.createBillOfMaterial.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productId: ctx.finishedGood.id,
      code: "BOM-CHAIR-V2",
      name: "Silla v2",
      components: [{ componentProductId: ctx.componentA.id, quantityPerUnit: "3.0000" }],
    });
    expect(second.version).toBe(2);
  });

  it("rejects a duplicate code within the same company", async () => {
    const ctx = await buildManufacturingTestContext();
    await ctx.createBillOfMaterial.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productId: ctx.finishedGood.id,
      code: "BOM-CHAIR",
      name: "Silla",
      components: [{ componentProductId: ctx.componentA.id, quantityPerUnit: "2.0000" }],
    });
    await expect(
      ctx.createBillOfMaterial.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        productId: ctx.finishedGood.id,
        code: "BOM-CHAIR",
        name: "Silla otra vez",
        components: [{ componentProductId: ctx.componentA.id, quantityPerUnit: "1.0000" }],
      }),
    ).rejects.toThrow(BillOfMaterialCodeAlreadyInUseError);
  });

  it("rejects a finished good from another company", async () => {
    const ctx = await buildManufacturingTestContext();
    await expect(
      ctx.createBillOfMaterial.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        productId: ctx.otherCompanyProduct.id,
        code: "BOM-X",
        name: "X",
        components: [{ componentProductId: ctx.componentA.id, quantityPerUnit: "1.0000" }],
      }),
    ).rejects.toThrow(ProductNotFoundError);
  });

  it("rejects a finished good that does not track inventory", async () => {
    const ctx = await buildManufacturingTestContext();
    await expect(
      ctx.createBillOfMaterial.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        productId: ctx.untrackedComponent.id,
        code: "BOM-X",
        name: "X",
        components: [{ componentProductId: ctx.componentA.id, quantityPerUnit: "1.0000" }],
      }),
    ).rejects.toThrow(ProductNotInventoryTrackedError);
  });

  it("rejects a component that does not track inventory", async () => {
    const ctx = await buildManufacturingTestContext();
    await expect(
      ctx.createBillOfMaterial.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        productId: ctx.finishedGood.id,
        code: "BOM-X",
        name: "X",
        components: [{ componentProductId: ctx.untrackedComponent.id, quantityPerUnit: "1.0000" }],
      }),
    ).rejects.toThrow(ProductNotInventoryTrackedError);
  });

  it("rejects a BOM with zero components", async () => {
    const ctx = await buildManufacturingTestContext();
    await expect(
      ctx.createBillOfMaterial.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        productId: ctx.finishedGood.id,
        code: "BOM-X",
        name: "X",
        components: [],
      }),
    ).rejects.toThrow(BillOfMaterialHasNoComponentsError);
  });

  it("rejects the finished good being listed as its own component", async () => {
    const ctx = await buildManufacturingTestContext();
    await expect(
      ctx.createBillOfMaterial.execute({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        productId: ctx.finishedGood.id,
        code: "BOM-X",
        name: "X",
        components: [{ componentProductId: ctx.finishedGood.id, quantityPerUnit: "1.0000" }],
      }),
    ).rejects.toThrow(ComponentCannotBeFinishedGoodError);
  });

  it("activates and deactivates a BOM", async () => {
    const ctx = await buildManufacturingTestContext();
    const bom = await ctx.createBillOfMaterial.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productId: ctx.finishedGood.id,
      code: "BOM-CHAIR",
      name: "Silla",
      components: [{ componentProductId: ctx.componentA.id, quantityPerUnit: "2.0000" }],
    });
    const deactivated = await ctx.setBillOfMaterialStatus.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      billOfMaterialId: bom.id,
      status: "INACTIVE",
    });
    expect(deactivated.status).toBe("INACTIVE");
  });

  it("rejects getting a BOM from another company", async () => {
    const ctx = await buildManufacturingTestContext();
    const bom = await ctx.createBillOfMaterial.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productId: ctx.finishedGood.id,
      code: "BOM-CHAIR",
      name: "Silla",
      components: [{ componentProductId: ctx.componentA.id, quantityPerUnit: "2.0000" }],
    });
    await expect(
      ctx.getBillOfMaterial.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, billOfMaterialId: bom.id }),
    ).rejects.toThrow(BillOfMaterialNotFoundError);
  });

  it("lists BOMs scoped to a company", async () => {
    const ctx = await buildManufacturingTestContext();
    await ctx.createBillOfMaterial.execute({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      productId: ctx.finishedGood.id,
      code: "BOM-CHAIR",
      name: "Silla",
      components: [{ componentProductId: ctx.componentA.id, quantityPerUnit: "2.0000" }],
    });
    const list = await ctx.listBillsOfMaterial.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: {} });
    expect(list).toHaveLength(1);
  });
});
