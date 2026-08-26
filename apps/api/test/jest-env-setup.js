// Runs before any test module loads, so importing AppModule (whose
// ConfigModule.forRoot() validates env vars synchronously at decorator
// evaluation time) doesn't fail for the one required var with no default.
// No real connection is made in tests — PrismaService/RedisService are always stubbed out.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test_placeholder";
process.env.REDIS_URL ??= "redis://localhost:6379/0";
