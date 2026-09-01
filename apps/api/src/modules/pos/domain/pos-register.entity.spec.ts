import { PosRegister, PosRegisterProps } from "./pos-register.entity";

function buildProps(overrides: Partial<PosRegisterProps> = {}): PosRegisterProps {
  const now = new Date("2026-09-01T00:00:00.000Z");
  return {
    id: "register-1",
    tenantId: "tenant-1",
    companyId: "company-1",
    warehouseId: "warehouse-1",
    code: "  REG-1  ",
    name: "  Caja principal  ",
    status: "ACTIVE",
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("PosRegister", () => {
  it("trims code and name", () => {
    const register = PosRegister.create(buildProps());
    expect(register.code).toBe("REG-1");
    expect(register.name).toBe("Caja principal");
  });

  it("rejects a blank code", () => {
    expect(() => PosRegister.create(buildProps({ code: "   " }))).toThrow(/code is required/);
  });

  it("rejects a blank name", () => {
    expect(() => PosRegister.create(buildProps({ name: "   " }))).toThrow(/name is required/);
  });

  it("bumps version only when the status actually changes", () => {
    const register = PosRegister.create(buildProps());
    register.setStatus("ACTIVE");
    expect(register.version).toBe(1);
    register.setStatus("INACTIVE");
    expect(register.version).toBe(2);
    expect(register.status).toBe("INACTIVE");
  });
});
