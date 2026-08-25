import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export const CORRELATION_ID_HEADER = "x-correlation-id";

declare module "express" {
  interface Request {
    correlationId: string;
  }
}

/** Assigns/propagates a correlation id so a request can be traced through logs, errors and audit. */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header(CORRELATION_ID_HEADER);
    req.correlationId = incoming && incoming.length > 0 ? incoming : randomUUID();
    res.setHeader(CORRELATION_ID_HEADER, req.correlationId);
    next();
  }
}
