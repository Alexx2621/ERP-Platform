import type { User } from "../../users";
import type { Session } from "../domain/session.entity";

export interface AuthContext {
  user: User;
  session: Session;
}

declare module "express" {
  interface Request {
    authContext?: AuthContext;
  }
}
