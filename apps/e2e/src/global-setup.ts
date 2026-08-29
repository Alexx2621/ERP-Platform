import { execFile, spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { FullConfig } from "@playwright/test";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer, type StartedRedisContainer } from "@testcontainers/redis";
import { MinioContainer, type StartedMinioContainer } from "@testcontainers/minio";

const execFileAsync = promisify(execFile);
const POSTGRES_IMAGE = "postgres:16-alpine";
const REDIS_IMAGE = "redis:7-alpine";
const MINIO_IMAGE = "minio/minio:latest";
const MINIO_USERNAME = "erp_e2e_minio";
const MINIO_PASSWORD = "erp_e2e_minio_password";
const API_URL = "http://127.0.0.1:3000/api/v1/auth/me";
const WORKER_URL = "http://127.0.0.1:3011/health";
const ERP_WEB_URL = "http://127.0.0.1:5173/";
const STARTUP_TIMEOUT_MS = 60_000;

interface E2ERuntime {
  postgres?: StartedPostgreSqlContainer;
  redis?: StartedRedisContainer;
  minio?: StartedMinioContainer;
  api?: ChildProcess;
  worker?: ChildProcess;
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
  await stopProcess(runtime.worker);
  await stopProcess(runtime.api);
  await runtime.redis?.stop();
  await runtime.minio?.stop();
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
    runtime.minio = await new MinioContainer(MINIO_IMAGE)
      .withUsername(MINIO_USERNAME)
      .withPassword(MINIO_PASSWORD)
      .start();

    const databaseUrl = runtime.postgres.getConnectionUri();
    await deployMigrations(databaseUrl);

    // Exposed for test files that need a direct database connection — e.g.
    // granting `isPlatformAdmin` for the platform-admin E2E, which has no
    // API endpoint by design (see docs/DECISIONS.md ADR-007).
    process.env.E2E_DATABASE_URL = databaseUrl;

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
      FILES_S3_ENDPOINT: runtime.minio.getConnectionUrl(),
      FILES_S3_REGION: "us-east-1",
      FILES_S3_ACCESS_KEY_ID: MINIO_USERNAME,
      FILES_S3_SECRET_ACCESS_KEY: MINIO_PASSWORD,
      FILES_S3_BUCKET: "erp-e2e-files",
      FILES_S3_FORCE_PATH_STYLE: "true",
    });
    await waitForHttp(API_URL, runtime.api, 401);

    runtime.worker = startNodeProcess("worker", path.join(repoRoot, "apps/worker/dist/main.js"), [], {
      ...process.env,
      NODE_ENV: "test",
      PORT: "3011",
      DATABASE_URL: databaseUrl,
      OUTBOX_DISPATCH_INTERVAL_MS: "500",
    });
    await waitForHttp(WORKER_URL, runtime.worker, 200);

    runtime.erpWeb = startNodeProcess(
      "erp-web",
      path.join(repoRoot, "apps/erp-web/node_modules/vite/bin/vite.js"),
      ["--host", "127.0.0.1", "--port", "5173", "--strictPort"],
      process.env,
      path.join(repoRoot, "apps/erp-web"),
    );
    await waitForHttp(ERP_WEB_URL, runtime.erpWeb, 200);

    return async () => stopRuntime(runtime);
  } catch (error) {
    await stopRuntime(runtime);
    throw error;
  }
}
