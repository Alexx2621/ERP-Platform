// Runs before any test module loads, so importing WorkerModule (whose
// ConfigModule.forRoot() validates env vars synchronously at decorator
// evaluation time) doesn't fail for the one required var with no default.
// No real connection is made in tests — PrismaService is always stubbed out.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test_placeholder";
