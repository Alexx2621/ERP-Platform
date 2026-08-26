import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { RedisService } from "../../shared/redis/redis.service";
import { AuthModule } from "./auth.module";
import { AuthController } from "./presentation/auth.controller";
import { LoginUseCase } from "./application/use-cases/login.use-case";
import { ValidateSessionUseCase } from "./application/use-cases/validate-session.use-case";

// The real PrismaModule/RedisModule are @Global() (see shared/prisma,
// shared/redis) so their exports are visible inside AuthModule/UsersModule
// without either importing them explicitly. A plain `providers: [...]` entry
// on the *test* root module would NOT be visible inside AuthModule's own
// encapsulated scope, so the stubs have to be wrapped the same way.
@Global()
@Module({
  providers: [
    { provide: PrismaService, useValue: {} },
    { provide: RedisService, useValue: {} },
  ],
  exports: [PrismaService, RedisService],
})
class StubInfraModule {}

/**
 * Verifies the real Nest DI graph resolves (providers registered under the
 * right tokens, no missing dependencies, no import cycles) — a class of bug
 * the unit tests (which construct use cases by hand) cannot catch, since
 * they never ask Nest to wire anything.
 */
describe("AuthModule wiring", () => {
  it("compiles with all use cases and the controller resolvable", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              LOGIN_RATE_LIMIT_MAX: 5,
              LOGIN_RATE_LIMIT_WINDOW_SECONDS: 60,
              ACCESS_TOKEN_TTL_SECONDS: 900,
              REFRESH_TOKEN_TTL_SECONDS: 2_592_000,
            }),
          ],
        }),
        StubInfraModule,
        AuthModule,
      ],
    }).compile();

    expect(moduleRef.get(AuthController)).toBeInstanceOf(AuthController);
    expect(moduleRef.get(LoginUseCase)).toBeInstanceOf(LoginUseCase);
    expect(moduleRef.get(ValidateSessionUseCase)).toBeInstanceOf(ValidateSessionUseCase);

    await moduleRef.close();
  });
});
