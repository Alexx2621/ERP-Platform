import { Controller, Get } from "@nestjs/common";

export interface HealthStatus {
  status: "ok";
  uptimeSeconds: number;
}

/**
 * Liveness endpoint (MASTER_SPEC §37) — confirms the process is up and the
 * Nest application context initialized successfully. Not a readiness check
 * against Postgres: the dispatcher's own poll loop already surfaces
 * connection failures in its logs every tick, and adding a DB round-trip
 * here would just duplicate that for no operational benefit yet.
 */
@Controller("health")
export class HealthController {
  @Get()
  check(): HealthStatus {
    return { status: "ok", uptimeSeconds: Math.floor(process.uptime()) };
  }
}
