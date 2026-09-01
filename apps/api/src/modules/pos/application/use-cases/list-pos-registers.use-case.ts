import { Inject, Injectable } from "@nestjs/common";
import { PosRegister } from "../../domain/pos-register.entity";
import { ListPosRegistersFilter, POS_REGISTER_REPOSITORY, PosRegisterRepository } from "../../domain/pos-register.repository";

export interface ListPosRegistersInput {
  tenantId: string;
  companyId: string;
  filter: ListPosRegistersFilter;
}

@Injectable()
export class ListPosRegistersUseCase {
  constructor(@Inject(POS_REGISTER_REPOSITORY) private readonly registers: PosRegisterRepository) {}

  async execute(input: ListPosRegistersInput): Promise<PosRegister[]> {
    return this.registers.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
