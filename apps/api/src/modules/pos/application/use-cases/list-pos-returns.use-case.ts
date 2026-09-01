import { Inject, Injectable } from "@nestjs/common";
import { PosReturn } from "../../domain/pos-return.entity";
import { ListPosReturnsFilter, POS_RETURN_REPOSITORY, PosReturnRepository } from "../../domain/pos-return.repository";

export interface ListPosReturnsInput {
  tenantId: string;
  companyId: string;
  filter: ListPosReturnsFilter;
}

@Injectable()
export class ListPosReturnsUseCase {
  constructor(@Inject(POS_RETURN_REPOSITORY) private readonly posReturns: PosReturnRepository) {}

  async execute(input: ListPosReturnsInput): Promise<PosReturn[]> {
    return this.posReturns.listByCompany(input.tenantId, input.companyId, input.filter);
  }
}
