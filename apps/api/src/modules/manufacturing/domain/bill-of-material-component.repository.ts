import { BillOfMaterialComponent } from "./bill-of-material-component.entity";

export interface BillOfMaterialComponentRepository {
  listByBillOfMaterial(tenantId: string, billOfMaterialId: string): Promise<BillOfMaterialComponent[]>;
  save(component: BillOfMaterialComponent): Promise<void>;
}

export const BILL_OF_MATERIAL_COMPONENT_REPOSITORY = Symbol("BILL_OF_MATERIAL_COMPONENT_REPOSITORY");
