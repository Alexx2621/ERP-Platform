import { context, propagation, trace, TraceFlags } from "@opentelemetry/api";
import { AsyncHooksContextManager } from "@opentelemetry/context-async-hooks";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { captureTraceContext, restoreTraceContext } from "./trace-context";

// `@opentelemetry/api` alone ships only no-op propagator/context-manager/
// tracer implementations — both are normally registered for real by
// `startTracing()`'s `NodeSDK.start()` call in the running app (the
// context manager is what makes `context.with()`/`context.active()`
// actually track the "current" context at all; without one, `with()`
// silently runs the callback against the no-op root context instead).
// This test never starts the SDK, so it registers the same two real
// implementations by hand to exercise the actual inject/extract wire
// format end-to-end.
beforeAll(() => {
  propagation.setGlobalPropagator(new W3CTraceContextPropagator());
  context.setGlobalContextManager(new AsyncHooksContextManager().enable());
});

describe("captureTraceContext", () => {
  it("returns null when there is no active span", () => {
    expect(captureTraceContext()).toBeNull();
  });

  it("captures the active span's context as a W3C traceparent header", () => {
    const spanContext = {
      traceId: "0af7651916cd43dd8448eb211c80319c",
      spanId: "b7ad6b7169203331",
      traceFlags: TraceFlags.SAMPLED,
    };
    const ctx = trace.setSpanContext(context.active(), spanContext);

    const captured = context.with(ctx, () => captureTraceContext());

    expect(captured).not.toBeNull();
    expect(captured?.traceParent).toBe(
      "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
    );
    expect(captured?.traceState).toBeNull();
  });
});

describe("restoreTraceContext", () => {
  it("returns the current active context unchanged when no traceParent was stored", () => {
    const restored = restoreTraceContext({ traceParent: null, traceState: null });
    expect(trace.getSpanContext(restored)).toBeUndefined();
  });

  it("rehydrates a Context carrying the stored span's identity", () => {
    const restored = restoreTraceContext({
      traceParent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
      traceState: null,
    });

    const spanContext = trace.getSpanContext(restored);
    expect(spanContext?.traceId).toBe("0af7651916cd43dd8448eb211c80319c");
    expect(spanContext?.spanId).toBe("b7ad6b7169203331");
    expect(spanContext?.isRemote).toBe(true);
  });

  it("round-trips capture -> persist -> restore back to the same trace id", () => {
    const spanContext = {
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
      spanId: "00f067aa0ba902b7",
      traceFlags: TraceFlags.SAMPLED,
    };
    const ctx = trace.setSpanContext(context.active(), spanContext);

    const captured = context.with(ctx, () => captureTraceContext());
    expect(captured).not.toBeNull();

    const restored = restoreTraceContext({
      traceParent: captured?.traceParent ?? null,
      traceState: captured?.traceState ?? null,
    });

    expect(trace.getSpanContext(restored)?.traceId).toBe(spanContext.traceId);
  });
});
