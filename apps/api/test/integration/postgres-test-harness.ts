import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { createPrismaClient, type PrismaClient } from "@erp/database";

const execFileAsync = promisify(execFile);
const POSTGRES_IMAGE = "postgres:16-alpine";
const DATABASE_NAME = "erp_integration";
const DATABASE_USERNAME = "erp_test";
const DATABASE_PASSWORD = "erp_test_password";

export interface PostgresTestHarness {
  prisma: PrismaClient;
  connectionString: string;
  reset: () => Promise<void>;
  stop: () => Promise<void>;
}

async function deployMigrations(connectionString: string): Promise<void> {
  const databasePackagePath = path.resolve(__dirname, "../../../../packages/database");
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

export async function startPostgresTestHarness(): Promise<PostgresTestHarness> {
  let container: StartedPostgreSqlContainer | undefined;
  let prisma: PrismaClient | undefined;

  try {
    container = await new PostgreSqlContainer(POSTGRES_IMAGE)
      .withDatabase(DATABASE_NAME)
      .withUsername(DATABASE_USERNAME)
      .withPassword(DATABASE_PASSWORD)
      .start();

    const connectionString = container.getConnectionUri();
    await deployMigrations(connectionString);

    prisma = createPrismaClient({ connectionString });
    await prisma.$connect();

    return {
      prisma,
      connectionString,
      reset: async () => {
        await prisma?.$executeRawUnsafe(
          'TRUNCATE TABLE "notification_deliveries", "notifications", "file_objects", "outbox_messages", "audit_entries", "sessions", "user_credentials", "user_preferences", "setting_values", "setting_definitions", "role_assignments", "role_permissions", "roles", "permissions", "companies", "organizations", "memberships", "tenants", "users" CASCADE',
        );
      },
      stop: async () => {
        await prisma?.$disconnect();
        await container?.stop();
      },
    };
  } catch (error) {
    await prisma?.$disconnect();
    await container?.stop();
    throw error;
  }
}
