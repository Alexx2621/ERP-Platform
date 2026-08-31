/** Public contract of the Taxes module. Other modules must only import from here. */
export { Tax, type TaxProps } from "./domain/tax.entity";
export { CreateTaxUseCase } from "./application/use-cases/create-tax.use-case";
export { ListTaxesUseCase } from "./application/use-cases/list-taxes.use-case";
export * from "./application/errors";
export { TaxesController } from "./presentation/taxes.controller";
export { TaxesModule } from "./taxes.module";
