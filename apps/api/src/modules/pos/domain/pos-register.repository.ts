import { PosRegister, MasterDataStatus } from "./pos-register.entity";

export interface ListPosRegistersFilter {
  status?: MasterDataStatus;
  limit: number;
}

export interface PosRegisterRepository {
  findById(tenantId: string, id: string): Promise<PosRegister | null>;
  findByCode(tenantId: string, companyId: string, code: string): Promise<PosRegister | null>;
  listByCompany(tenantId: string, companyId: string, filter: ListPosRegistersFilter): Promise<PosRegister[]>;
  save(register: PosRegister): Promise<void>;
}

export const POS_REGISTER_REPOSITORY = Symbol("POS_REGISTER_REPOSITORY");
