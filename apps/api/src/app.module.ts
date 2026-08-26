import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "./shared/config/environment-variables";
import { PrismaModule } from "./shared/prisma/prisma.module";
import { RedisModule } from "./shared/redis/redis.module";
import { CorrelationIdMiddleware } from "./shared/http/correlation-id.middleware";
import { UsersModule } from "./core/users";
import { AuthModule } from "./core/auth";
import { TenantsModule } from "./core/tenants";
import { OrganizationsModule } from "./core/organizations";
import { CompaniesModule } from "./core/companies";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    RedisModule,
    UsersModule,
    AuthModule,
    OrganizationsModule,
    CompaniesModule,
    TenantsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes("*");
  }
}
