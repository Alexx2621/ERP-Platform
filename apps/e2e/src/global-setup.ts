import { execFile, spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { FullConfig } from "@playwright/test";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer, type StartedRedisContainer } from "@testcontainers/redis";

const execFileAsync = promisify(execFile);
const POSTGRES_IMAGE = "postgres:16-alpine";
const REDIS_IMAGE = "redis:7-alpine";
const API_URL = "http://127.0.0.1:3000/api/v1/auth/me";
const ERP_WEB_URL = "http://127.0.0.1:5173/";
const STARTUP_TIMEOUT_MS = 60_000;

interface E2ERuntime {
  postgres?: StartedPostgreSqlContainer;
  redis?: StartedRedisContainer;
  api?: ChildProcess;
  erpWeb?: ChildProcess;
}

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

function forwardOutput(child: ChildProcess, label: string): void {
  child.stdout?.on("data", (chunk: Buffer) => process.stdout.write(`[${label}] ${chunk.toString()}`));
  child.stderr?.on("data", (chunk: Buffer) => process.stderr.write(`[${label}] ${chunk.toString()}`));
}

function startNodeProcess(
  label: string,
  entrypoint: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  cwd = repoRoot,
): ChildProcess {
  const child = spawn(process.execPath, [entrypoint, ...args], {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  forwardOutput(child, label);
  return child;
}

async function waitForHttp(url: string, child: ChildProcess, expectedStatus?: number): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Process exited before ${url} became available (exit ${child.exitCode}).`);
    }

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (expectedStatus === undefined || response.status === expectedStatus) {
        return;
      }
    } catch {
      // The process may still be booting. Retry until the startup deadline.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

async function deployMigrations(connectionString: string): Promise<void> {
  const databasePackagePath = path.join(repoRoot, "packages/database");
  const prismaCliPath = path.join(databasePackagePath, "node_modules/prisma/build/index.js");

  await execFileAsync(
    process.execPath,
    [prismaCliPath, "migrate", "deploy", "--config", "prisma7.config.ts"],
    {
      cwd: databasePackagePath,
      env: { ...process.env, DATABASE_URL: connectionString },
      timeout: 90_000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
}

async function stopProcess(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 10_000))]);

  if (child.exitCode === null) {
    child.kill("SIGKILL");
    await Promise.race([
      once(child, "exit"),
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]);
  }
}

async function stopRuntime(runtime: E2ERuntime): Promise<void> {
  await stopProcess(runtime.erpWeb);
  await stopProcess(runtime.api);
  await runtime.redis?.stop();
  await runtime.postgres?.stop();
}

export default async function globalSetup(_config: FullConfig): Promise<() => Promise<void>> {
  const runtime: E2ERuntime = {};

  try {
    runtime.postgres = await new PostgreSqlContainer(POSTGRES_IMAGE)
      .withDatabase("erp_e2e")
      .withUsername("erp_e2e")
      .withPassword("erp_e2e_password")
      .start();
    runtime.redis = await new RedisContainer(REDIS_IMAGE).start();

    const databaseUrl = runtime.postgres.getConnectionUri();
    process.env.E2E_POSTGRES_CONTAINER_ID = runtime.postgres.getId();
    await deployMigrations(databaseUrl);

    runtime.api = startNodeProcess("api", path.join(repoRoot, "apps/api/dist/main.js"), [], {
      ...process.env,
      NODE_ENV: "test",
      PORT: "3000",
      DATABASE_URL: databaseUrl,
      REDIS_URL: runtime.redis.getConnectionUrl(),
      ACCESS_TOKEN_TTL_SECONDS: "900",
      REFRESH_TOKEN_TTL_SECONDS: "2592000",
      LOGIN_RATE_LIMIT_MAX: "50",
      LOGIN_RATE_LIMIT_WINDOW_SECONDS: "60",
    });
    await waitForHttp(API_URL, runtime.api, 401);

    runtime.erpWeb = startNodeProcess(
      "erp-web",
      path.join(repoRoot, "apps/erp-web/node_modules/vite/bin/vite.js"),
      ["--host", "127.0.0.1", "--port", "5173", "--strictPort"],
      process.env,
      path.join(repoRoot, "apps/erp-web"),
    );
    await waitForHttp(ERP_WEB_URL, runtime.erpWeb, 200);

    return async () => {
      delete process.env.E2E_POSTGRES_CONTAINER_ID;
      await stopRuntime(runtime);
    };
  } catch (error) {
    delete process.env.E2E_POSTGRES_CONTAINER_ID;
    await stopRuntime(runtime);
    throw error;
  }
}
