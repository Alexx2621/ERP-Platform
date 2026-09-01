import { buildSalesTestContext } from "../../sales/test-support/build-sales-test-context";
import { InMemoryPaymentRepository } from "../../payments/test-support/in-memory-payment.repository";
import { CapturePaymentUseCase } from "../../payments/application/use-cases/capture-payment.use-case";
import { RefundPaymentUseCase } from "../../payments/application/use-cases/refund-payment.use-case";
import { CashPaymentGatewayAdapter } from "../../payments/infrastructure/cash-payment-gateway.adapter";
import { BankTransferPaymentGatewayAdapter } from "../../payments/infrastructure/bank-transfer-payment-gateway.adapter";
import type { PaymentGateway } from "../../payments/application/ports/payment-gateway.port";
import { InMemoryPosRegisterRepository } from "./in-memory-pos-register.repository";
import { InMemoryPosShiftRepository } from "./in-memory-pos-shift.repository";
import { InMemoryPosCashMovementRepository } from "./in-memory-pos-cash-movement.repository";
import { InMemoryPosSaleRepository } from "./in-memory-pos-sale.repository";
import { InMemoryPosReturnRepository } from "./in-memory-pos-return.repository";
import { CreatePosRegisterUseCase } from "../application/use-cases/create-pos-register.use-case";
import { SetPosRegisterStatusUseCase } from "../application/use-cases/set-pos-register-status.use-case";
import { ListPosRegistersUseCase } from "../application/use-cases/list-pos-registers.use-case";
import { OpenShiftUseCase } from "../application/use-cases/open-shift.use-case";
import { CloseShiftUseCase } from "../application/use-cases/close-shift.use-case";
import { ListPosShiftsUseCase } from "../application/use-cases/list-pos-shifts.use-case";
import { GetPosShiftUseCase } from "../application/use-cases/get-pos-shift.use-case";
import { RecordCashMovementUseCase } from "../application/use-cases/record-cash-movement.use-case";
import { ListCashMovementsUseCase } from "../application/use-cases/list-cash-movements.use-case";
import { RingUpSaleUseCase } from "../application/use-cases/ring-up-sale.use-case";
import { ListPosSalesUseCase } from "../application/use-cases/list-pos-sales.use-case";
import { GetPosSaleUseCase } from "../application/use-cases/get-pos-sale.use-case";
import { CreatePosReturnUseCase } from "../application/use-cases/create-pos-return.use-case";
import { ListPosReturnsUseCase } from "../application/use-cases/list-pos-returns.use-case";

/**
 * Shared fixture builder for POS application-layer tests, mirroring the
 * project's established `buildSalesTestContext()`/`buildPurchasingTestContext()`
 * pattern: real use cases wired to real in-memory repositories across every
 * module POS depends on, never mocks. Layers Payments and POS's own pieces
 * directly on top of a real `buildSalesTestContext()`, since the only
 * catalog/warehouse/customer fixtures POS itself needs (a tracked product, a
 * warehouse, a customer) already exist there — a second, separate warehouse
 * store would leave `CreatePosRegisterUseCase`'s `GetWarehouseUseCase` unable
 * to see `sales.warehouse` at all.
 */
export async function buildPosTestContext() {
  const sales = await buildSalesTestContext();

  // Payments
  const payments = new InMemoryPaymentRepository();
  const gateways: PaymentGateway[] = [new CashPaymentGatewayAdapter(), new BankTransferPaymentGatewayAdapter()];
  const capturePayment = new CapturePaymentUseCase(payments, gateways, sales.getSalesOrder);
  const refundPayment = new RefundPaymentUseCase(payments, gateways);

  // POS
  const registers = new InMemoryPosRegisterRepository();
  const shifts = new InMemoryPosShiftRepository();
  const cashMovements = new InMemoryPosCashMovementRepository();
  const posSales = new InMemoryPosSaleRepository();
  const posReturns = new InMemoryPosReturnRepository();

  const createRegister = new CreatePosRegisterUseCase(registers, sales.getWarehouse);
  const setRegisterStatus = new SetPosRegisterStatusUseCase(registers);
  const listRegisters = new ListPosRegistersUseCase(registers);

  const openShift = new OpenShiftUseCase(shifts, registers);
  const closeShift = new CloseShiftUseCase(shifts, cashMovements, posSales, posReturns);
  const listShifts = new ListPosShiftsUseCase(shifts);
  const getShift = new GetPosShiftUseCase(shifts);

  const recordCashMovement = new RecordCashMovementUseCase(cashMovements, shifts);
  const listCashMovements = new ListCashMovementsUseCase(cashMovements, shifts);

  const ringUpSale = new RingUpSaleUseCase(
    posSales,
    shifts,
    registers,
    sales.createSalesOrder,
    sales.addSalesOrderLine,
    sales.confirmSalesOrder,
    sales.cancelSalesOrder,
    sales.fulfillSalesOrder,
    sales.listSalesOrderLines,
    capturePayment,
  );
  const listPosSales = new ListPosSalesUseCase(posSales);
  const getPosSale = new GetPosSaleUseCase(posSales);

  const createPosReturn = new CreatePosReturnUseCase(posReturns, posSales, shifts, sales.createSalesReturn, refundPayment);
  const listPosReturns = new ListPosReturnsUseCase(posReturns);

  const register = await createRegister.execute({
    tenantId: sales.tenantId,
    companyId: sales.companyId,
    warehouseId: sales.warehouse.id,
    code: "REG-1",
    name: "Caja 1",
  });

  return {
    ...sales,
    payments,
    capturePayment,
    refundPayment,
    registers,
    shifts,
    cashMovements,
    posSales,
    posReturns,
    register,
    createRegister,
    setRegisterStatus,
    listRegisters,
    openShift,
    closeShift,
    listShifts,
    getShift,
    recordCashMovement,
    listCashMovements,
    ringUpSale,
    listPosSales,
    getPosSale,
    createPosReturn,
    listPosReturns,
  };
}

export type PosTestContext = Awaited<ReturnType<typeof buildPosTestContext>>;
