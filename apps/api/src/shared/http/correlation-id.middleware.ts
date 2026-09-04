import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { trace } from "@opentelemetry/api";

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
    // Cross-references this request's OTel span (auto-created by the HTTP
    // instrumentation, docs/ARCHITECTURE.md §11) with the app's own
    // correlationId — the two identity systems stay independent, but a
    // trace found in Jaeger can be looked up by correlationId, and vice
    // versa, without merging them into one.
    trace.getActiveSpan()?.setAttribute("app.correlation_id", req.correlationId);
    next();
  }
}
