import { buildPosTestContext } from "../../test-support/build-pos-test-context";
import { PosRegisterCodeAlreadyInUseError, PosRegisterNotFoundError, WarehouseNotFoundError } from "../errors";

describe("PosRegister lifecycle use cases", () => {
  it("creates a register tied to a real warehouse", async () => {
    const ctx = await buildPosTestContext();
    // the register created inside buildPosTestContext() itself
    expect(ctx.register.warehouseId).toBe(ctx.warehouse.id);
    expect(ctx.register.status).toBe("ACTIVE");
  });

  it("rejects a warehouse that does not exist in this company", async () => {
    const ctx = await buildPosTestContext();
    await expect(
      ctx.createRegister.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, warehouseId: "missing", code: "REG-2", name: "Caja 2" }),
    ).rejects.toThrow(WarehouseNotFoundError);
  });

  it("rejects a warehouse belonging to a different company", async () => {
    const ctx = await buildPosTestContext();
    await expect(
      ctx.createRegister.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, warehouseId: ctx.warehouse.id, code: "REG-2", name: "Caja 2" }),
    ).rejects.toThrow(WarehouseNotFoundError);
  });

  it("rejects a duplicate register code within the same company, case-insensitively", async () => {
    const ctx = await buildPosTestContext();
    await expect(
      ctx.createRegister.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, warehouseId: ctx.warehouse.id, code: "reg-1", name: "Otra caja" }),
    ).rejects.toThrow(PosRegisterCodeAlreadyInUseError);
  });

  it("lists registers scoped to a company, filtered by status", async () => {
    const ctx = await buildPosTestContext();
    await ctx.createRegister.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, warehouseId: ctx.warehouse.id, code: "REG-2", name: "Caja 2" });
    const all = await ctx.listRegisters.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { limit: 50 } });
    expect(all).toHaveLength(2);

    const active = await ctx.listRegisters.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, filter: { status: "ACTIVE", limit: 50 } });
    expect(active).toHaveLength(2);
  });

  it("toggles a register's status", async () => {
    const ctx = await buildPosTestContext();
    const updated = await ctx.setRegisterStatus.execute({ tenantId: ctx.tenantId, companyId: ctx.companyId, id: ctx.register.id, status: "INACTIVE" });
    expect(updated.status).toBe("INACTIVE");
  });

  it("rejects setting status on a register from a different company", async () => {
    const ctx = await buildPosTestContext();
    await expect(
      ctx.setRegisterStatus.execute({ tenantId: ctx.tenantId, companyId: ctx.otherCompanyId, id: ctx.register.id, status: "INACTIVE" }),
    ).rejects.toThrow(PosRegisterNotFoundError);
  });
});
