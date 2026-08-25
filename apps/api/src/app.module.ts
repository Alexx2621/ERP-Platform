import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "./shared/config/environment-variables";
import { PrismaModule } from "./shared/prisma/prisma.module";
import { CorrelationIdMiddleware } from "./shared/http/correlation-id.middleware";
import { UsersModule } from "./core/users";
import { AuthModule } from "./core/auth";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes("*");
  }
}
