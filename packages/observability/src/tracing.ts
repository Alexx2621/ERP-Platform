import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { defaultResource, resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

export interface StartTracingOptions {
  /** Becomes `service.name` — how this process shows up in a trace backend (e.g. "erp-api", "erp-worker"). */
  serviceName: string;
  serviceVersion?: string;
}

const DEFAULT_OTLP_TRACES_PATH = "/v1/traces";
const DEFAULT_OTLP_ENDPOINT = "http://localhost:4318";

function resolveTracesUrl(): string {
  const explicit = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  if (explicit) {
    return explicit;
  }
  const base = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? DEFAULT_OTLP_ENDPOINT;
  return `${base.replace(/\/$/, "")}${DEFAULT_OTLP_TRACES_PATH}`;
}

let sdk: NodeSDK | null = null;

/**
 * Boots the OpenTelemetry Node SDK — must run before anything else in the
 * process imports `express`/`http`/`pg`/`ioredis`, since auto-instrumentation
 * works by patching those modules the first time they're required. This is
 * why it lives in its own entry file, loaded via `node -r` ahead of
 * `main.ts`, rather than as a top-of-file import inside `main.ts` itself —
 * a same-file import would already be too late (docs/ARCHITECTURE.md §11:
 * "OpenTelemetry se introduce detrás de una configuración común").
 *
 * Disabled entirely (a real no-op, not a silently-broken exporter) when
 * `OTEL_ENABLED=false` — set by the test config so Jest runs never try to
 * reach a collector that isn't there.
 */
export function startTracing(options: StartTracingOptions): void {
  if (process.env.OTEL_ENABLED === "false") {
    return;
  }

  sdk = new NodeSDK({
    resource: defaultResource().merge(
      resourceFromAttributes({
        [ATTR_SERVICE_NAME]: options.serviceName,
        [ATTR_SERVICE_VERSION]: options.serviceVersion ?? "0.0.0",
        [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV ?? "development",
      }),
    ),
    traceExporter: new OTLPTraceExporter({ url: resolveTracesUrl() }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Extremely chatty and rarely useful for an HTTP API/worker — every
        // fs.readFile/writeFile call becomes its own span otherwise.
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();

  const shutdown = (): void => {
    void sdk
      ?.shutdown()
      .catch(() => undefined)
      .finally(() => process.exit(0));
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
