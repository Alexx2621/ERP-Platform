import { Module } from "@nestjs/common";
import { AuthModule } from "../../core/auth";
import { TenantsModule } from "../../core/tenants";
import { AccessControlModule } from "../../core/access-control";
import { AuditModule } from "../../core/audit";
import { WarehousesModule } from "../warehouses";
import { SalesModule } from "../sales";
import { PaymentsModule } from "../payments";
import { POS_REGISTER_REPOSITORY } from "./domain/pos-register.repository";
import { POS_SHIFT_REPOSITORY } from "./domain/pos-shift.repository";
import { POS_CASH_MOVEMENT_REPOSITORY } from "./domain/pos-cash-movement.repository";
import { POS_SALE_REPOSITORY } from "./domain/pos-sale.repository";
import { POS_RETURN_REPOSITORY } from "./domain/pos-return.repository";
import { PrismaPosRegisterRepository } from "./infrastructure/prisma-pos-register.repository";
import { PrismaPosShiftRepository } from "./infrastructure/prisma-pos-shift.repository";
import { PrismaPosCashMovementRepository } from "./infrastructure/prisma-pos-cash-movement.repository";
import { PrismaPosSaleRepository } from "./infrastructure/prisma-pos-sale.repository";
import { PrismaPosReturnRepository } from "./infrastructure/prisma-pos-return.repository";
import { CreatePosRegisterUseCase } from "./application/use-cases/create-pos-register.use-case";
import { SetPosRegisterStatusUseCase } from "./application/use-cases/set-pos-register-status.use-case";
import { ListPosRegistersUseCase } from "./application/use-cases/list-pos-registers.use-case";
import { OpenShiftUseCase } from "./application/use-cases/open-shift.use-case";
import { CloseShiftUseCase } from "./application/use-cases/close-shift.use-case";
import { ListPosShiftsUseCase } from "./application/use-cases/list-pos-shifts.use-case";
import { GetPosShiftUseCase } from "./application/use-cases/get-pos-shift.use-case";
import { RecordCashMovementUseCase } from "./application/use-cases/record-cash-movement.use-case";
import { ListCashMovementsUseCase } from "./application/use-cases/list-cash-movements.use-case";
import { RingUpSaleUseCase } from "./application/use-cases/ring-up-sale.use-case";
import { ListPosSalesUseCase } from "./application/use-cases/list-pos-sales.use-case";
import { GetPosSaleUseCase } from "./application/use-cases/get-pos-sale.use-case";
import { CreatePosReturnUseCase } from "./application/use-cases/create-pos-return.use-case";
import { ListPosReturnsUseCase } from "./application/use-cases/list-pos-returns.use-case";
import { PosRegistersController } from "./presentation/pos-registers.controller";
import { PosShiftsController } from "./presentation/pos-shifts.controller";
import { PosSalesController } from "./presentation/pos-sales.controller";
import { PosReturnsController } from "./presentation/pos-returns.controller";

/**
 * Phase 6 (POS) module. Three direct, cycle-free dependencies
 * (docs/ARCHITECTURE.md §6): Warehouses (a register's home warehouse),
 * Sales (`RingUpSaleUseCase`/`CreatePosReturnUseCase` orchestrate a real
 * `SalesOrder` end to end through its own public contract — create, add
 * lines, confirm, fulfill, return — exactly as the ERP Sales screen would),
 * and Payments (a real `Payment` captured/refunded through its own public
 * contract). None of those three modules knows POS exists — a POS sale is,
 * from Sales'/Payments' point of view, indistinguishable from any other
 * `channel: "POS"` order placed through their own controllers.
 */
@Module({
  imports: [AuthModule, TenantsModule, AccessControlModule, AuditModule, WarehousesModule, SalesModule, PaymentsModule],
  controllers: [PosRegistersController, PosShiftsController, PosSalesController, PosReturnsController],
  providers: [
    { provide: POS_REGISTER_REPOSITORY, useClass: PrismaPosRegisterRepository },
    { provide: POS_SHIFT_REPOSITORY, useClass: PrismaPosShiftRepository },
    { provide: POS_CASH_MOVEMENT_REPOSITORY, useClass: PrismaPosCashMovementRepository },
    { provide: POS_SALE_REPOSITORY, useClass: PrismaPosSaleRepository },
    { provide: POS_RETURN_REPOSITORY, useClass: PrismaPosReturnRepository },
    CreatePosRegisterUseCase,
    SetPosRegisterStatusUseCase,
    ListPosRegistersUseCase,
    OpenShiftUseCase,
    CloseShiftUseCase,
    ListPosShiftsUseCase,
    GetPosShiftUseCase,
    RecordCashMovementUseCase,
    ListCashMovementsUseCase,
    RingUpSaleUseCase,
    ListPosSalesUseCase,
    GetPosSaleUseCase,
    CreatePosReturnUseCase,
    ListPosReturnsUseCase,
  ],
  exports: [ListPosSalesUseCase, GetPosSaleUseCase],
})
export class PosModule {}
