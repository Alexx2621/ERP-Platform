import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { AuthModule } from "./auth.module";
import { AuthController } from "./presentation/auth.controller";
import { LoginUseCase } from "./application/use-cases/login.use-case";
import { ValidateSessionUseCase } from "./application/use-cases/validate-session.use-case";

// The real PrismaModule is @Global() (see shared/prisma/prisma.module.ts) so its
// export is visible inside AuthModule/UsersModule without either importing it
// explicitly. A plain `providers: [...]` entry on the *test* root module would
// NOT be visible inside AuthModule's own encapsulated scope, so the stub has
// to be wrapped the same way the real module is.
@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: {} }],
  exports: [PrismaService],
})
class StubPrismaModule {}

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
        StubPrismaModule,
        AuthModule,
      ],
    }).compile();

    expect(moduleRef.get(AuthController)).toBeInstanceOf(AuthController);
    expect(moduleRef.get(LoginUseCase)).toBeInstanceOf(LoginUseCase);
    expect(moduleRef.get(ValidateSessionUseCase)).toBeInstanceOf(ValidateSessionUseCase);

    await moduleRef.close();
  });
});
