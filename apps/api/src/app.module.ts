import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { S3Module } from './common/s3/s3.module';
import { TenantResolverMiddleware } from './common/middleware/tenant-resolver.middleware';
import { AuditModule } from './core/audit/audit.module';
import { AuthModule } from './core/auth/auth.module';
import { TenantModule } from './core/tenant/tenant.module';
import { FeatureFlagModule } from './core/feature-flag/feature-flag.module';
import { CatalogModule } from './core/catalog/catalog.module';
import { InventoryModule } from './core/inventory/inventory.module';
import { StorefrontCatalogModule } from './core/storefront-catalog/storefront-catalog.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RedisModule,
    S3Module,
    AuditModule,
    AuthModule,
    TenantModule,
    FeatureFlagModule,
    CatalogModule,
    InventoryModule,
    StorefrontCatalogModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantResolverMiddleware).forRoutes('*');
  }
}
