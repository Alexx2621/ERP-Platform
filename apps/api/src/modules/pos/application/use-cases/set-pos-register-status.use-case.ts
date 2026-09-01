import { Inject, Injectable } from "@nestjs/common";
import { MasterDataStatus, PosRegister } from "../../domain/pos-register.entity";
import { POS_REGISTER_REPOSITORY, PosRegisterRepository } from "../../domain/pos-register.repository";
import { PosRegisterNotFoundError } from "../errors";

export interface SetPosRegisterStatusInput {
  tenantId: string;
  companyId: string;
  id: string;
  status: MasterDataStatus;
}

@Injectable()
export class SetPosRegisterStatusUseCase {
  constructor(@Inject(POS_REGISTER_REPOSITORY) private readonly registers: PosRegisterRepository) {}

  async execute(input: SetPosRegisterStatusInput): Promise<PosRegister> {
    const register = await this.registers.findById(input.tenantId, input.id);
    if (!register || register.companyId !== input.companyId) {
      throw new PosRegisterNotFoundError();
    }
    register.setStatus(input.status);
    await this.registers.save(register);
    return register;
  }
}
