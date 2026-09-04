// Loaded via `node -r` (or `ts-node -r` in dev) BEFORE `main.ts`, so
// OpenTelemetry's auto-instrumentation can patch `express`/`http`/`pg` the
// first time they're `require()`'d — a same-file import at the top of
// `main.ts` would already be too late, since `NestFactory` transitively
// pulls in `express` as soon as `./app.module` is imported there. See the
// `start`/`start:dev` scripts in package.json for how this is loaded.
import { startTracing } from "@erp/observability";

startTracing({ serviceName: "erp-api" });
