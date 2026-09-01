import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@erp/database";
import { GetWarehouseUseCase } from "../../../warehouses";
import { PosRegister } from "../../domain/pos-register.entity";
import { POS_REGISTER_REPOSITORY, PosRegisterRepository } from "../../domain/pos-register.repository";
import { PosRegisterCodeAlreadyInUseError, WarehouseNotFoundError } from "../errors";

export interface CreatePosRegisterInput {
  tenantId: string;
  companyId: string;
  warehouseId: string;
  code: string;
  name: string;
}

@Injectable()
export class CreatePosRegisterUseCase {
  constructor(
    @Inject(POS_REGISTER_REPOSITORY) private readonly registers: PosRegisterRepository,
    private readonly getWarehouse: GetWarehouseUseCase,
  ) {}

  async execute(input: CreatePosRegisterInput): Promise<PosRegister> {
    const warehouse = await this.getWarehouse.execute(input.tenantId, input.warehouseId);
    if (!warehouse || warehouse.companyId !== input.companyId) {
      throw new WarehouseNotFoundError();
    }

    const code = input.code.trim();
    const existing = await this.registers.findByCode(input.tenantId, input.companyId, code);
    if (existing) {
      throw new PosRegisterCodeAlreadyInUseError(code);
    }

    const now = new Date();
    const register = PosRegister.create({
      id: newId(),
      tenantId: input.tenantId,
      companyId: input.companyId,
      warehouseId: warehouse.id,
      code,
      name: input.name,
      status: "ACTIVE",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await this.registers.save(register);
    return register;
  }
}
