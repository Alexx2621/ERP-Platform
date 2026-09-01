/** Public contract of the Sales module. Other modules must only import from here. */
export { Quote, type QuoteProps, type SalesChannel, type QuoteStatus } from "./domain/quote.entity";
export { QuoteLine, type QuoteLineProps } from "./domain/quote-line.entity";
export { SalesOrder, type SalesOrderProps, type SalesOrderStatus } from "./domain/sales-order.entity";
export { SalesOrderLine, type SalesOrderLineProps } from "./domain/sales-order-line.entity";
export { SalesReturn, type SalesReturnProps } from "./domain/sales-return.entity";
export { SalesReturnLine, type SalesReturnLineProps } from "./domain/sales-return-line.entity";
export { ListSalesOrdersUseCase } from "./application/use-cases/list-sales-orders.use-case";
export { ListSalesOrderLinesUseCase } from "./application/use-cases/list-sales-order-lines.use-case";
export { ListSalesReturnLinesUseCase } from "./application/use-cases/list-sales-return-lines.use-case";
export { GetSalesOrderUseCase } from "./application/use-cases/get-sales-order.use-case";
export { CreateSalesOrderUseCase, type CreateSalesOrderInput } from "./application/use-cases/create-sales-order.use-case";
export { AddSalesOrderLineUseCase, type AddSalesOrderLineInput } from "./application/use-cases/add-sales-order-line.use-case";
export { ConfirmSalesOrderUseCase } from "./application/use-cases/confirm-sales-order.use-case";
export { CancelSalesOrderUseCase } from "./application/use-cases/cancel-sales-order.use-case";
export { FulfillSalesOrderUseCase } from "./application/use-cases/fulfill-sales-order.use-case";
export {
  CreateSalesReturnUseCase,
  type CreateSalesReturnInput,
  type CreateSalesReturnLineInput,
} from "./application/use-cases/create-sales-return.use-case";
export * from "./application/errors";
export { QuotesController } from "./presentation/quotes.controller";
export { SalesOrdersController } from "./presentation/sales-orders.controller";
export { SalesReturnsController } from "./presentation/sales-returns.controller";
export { SalesModule } from "./sales.module";
