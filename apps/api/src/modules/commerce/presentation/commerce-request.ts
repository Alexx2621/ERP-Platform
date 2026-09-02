import type { Storefront } from "../domain/storefront.entity";

declare module "express" {
  interface Request {
    storefront?: Storefront;
  }
}
