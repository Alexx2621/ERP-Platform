import { context, propagation, type Context } from "@opentelemetry/api";

/**
 * The W3C Trace Context header pair (https://www.w3.org/TR/trace-context/),
 * stored verbatim on an outbox row so a later, separate process (the
 * dispatcher/worker) can continue the same trace instead of starting an
 * unrelated one — the outbox row is the only thing that crosses the API
 * process → worker process boundary (docs/ARCHITECTURE.md §11: "traces
 * cruzan API, outbox, worker e integración").
 */
export interface SerializedTraceContext {
  traceParent: string;
  traceState: string | null;
}

/**
 * Captures the currently active span's context as W3C header values.
 * Returns null when there is no active span — e.g. a boot-time seeder
 * running outside any request or dispatch span. Call this once, right
 * before persisting the outbox row that will carry it (same transaction
 * as the write it describes, same as `correlationId`).
 */
export function captureTraceContext(): SerializedTraceContext | null {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  const traceParent = carrier.traceparent;
  if (!traceParent) {
    return null;
  }
  return { traceParent, traceState: carrier.tracestate ?? null };
}

/**
 * Rehydrates a Context from a persisted outbox row's trace columns, so a
 * dispatch span (and everything nested under it — the handler, its own DB
 * queries) is created as a continuation of the original request's trace
 * rather than an unrelated one. Falls back to the currently active context
 * (effectively a no-op extraction) when the row carries no trace context —
 * e.g. a message appended outside any active span.
 */
export function restoreTraceContext(stored: {
  traceParent: string | null;
  traceState: string | null;
}): Context {
  if (!stored.traceParent) {
    return context.active();
  }
  const carrier: Record<string, string> = { traceparent: stored.traceParent };
  if (stored.traceState) {
    carrier.tracestate = stored.traceState;
  }
  return propagation.extract(context.active(), carrier);
}
