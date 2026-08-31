import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "./shared/config/environment-variables";
import { PrismaModule } from "./shared/prisma/prisma.module";
import { RedisModule } from "./shared/redis/redis.module";
import { EmailModule } from "./shared/email/email.module";
import { CorrelationIdMiddleware } from "./shared/http/correlation-id.middleware";
import { UsersModule } from "./core/users";
import { AuthModule } from "./core/auth";
import { TenantsModule } from "./core/tenants";
import { OrganizationsModule } from "./core/organizations";
import { CompaniesModule } from "./core/companies";
import { AccessControlModule } from "./core/access-control";
import { ConfigurationModule } from "./core/configuration";
import { AuditModule } from "./core/audit";
import { FilesModule } from "./core/files";
import { NotificationsModule } from "./core/notifications";
import { PlatformAdminModule } from "./core/platform-admin";
import { AppRegistryModule } from "./core/app-registry";
import { CatalogModule } from "./modules/catalog";
import { CustomersModule } from "./modules/customers";
import { SuppliersModule } from "./modules/suppliers";
import { TaxesModule } from "./modules/taxes";
import { WarehousesModule } from "./modules/warehouses";
import { PricingModule } from "./modules/pricing";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    RedisModule,
    EmailModule,
    UsersModule,
    AuthModule,
    OrganizationsModule,
    CompaniesModule,
    AccessControlModule,
    AuditModule,
    TenantsModule,
    ConfigurationModule,
    FilesModule,
    NotificationsModule,
    PlatformAdminModule,
    AppRegistryModule,
    CatalogModule,
    CustomersModule,
    SuppliersModule,
    TaxesModule,
    WarehousesModule,
    PricingModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes("*");
  }
}
