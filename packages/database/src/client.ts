import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

export type { Prisma, User, UserCredential, Session } from "../generated/prisma/client";
export { UserStatus, SessionStatus } from "../generated/prisma/enums";
export { PrismaClient };

export interface CreatePrismaClientOptions {
  connectionString: string;
}

/**
 * Builds the constructor options PrismaClient needs to connect to PostgreSQL
 * via the `pg` driver adapter (Prisma 7 no longer accepts `datasource.url` in
 * schema.prisma, see https://pris.ly/d/adapter-pg). Exposed separately from
 * `createPrismaClient` so consumers that need to `extends PrismaClient`
 * (e.g. a Nest lifecycle-managed service) can pass this straight to `super()`.
 */
export function createPrismaClientOptions(
  options: CreatePrismaClientOptions,
): ConstructorParameters<typeof PrismaClient>[0] {
  return { adapter: new PrismaPg({ connectionString: options.connectionString }) };
}

/** Creates a standalone PrismaClient wired to PostgreSQL. */
export function createPrismaClient(options: CreatePrismaClientOptions): PrismaClient {
  return new PrismaClient(createPrismaClientOptions(options));
}
