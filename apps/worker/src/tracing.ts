// Loaded via `node -r` (or `ts-node -r` in dev) BEFORE `main.ts` — see
// apps/api/src/tracing.ts's docstring for why this has to be a separate
// pre-required entry file rather than a top-of-file import inside `main.ts`.
import { startTracing } from "@erp/observability";

startTracing({ serviceName: "erp-worker" });
