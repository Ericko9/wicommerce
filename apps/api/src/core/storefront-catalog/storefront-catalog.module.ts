import { Module } from '@nestjs/common';
import { StorefrontCatalogService } from './storefront-catalog.service';
import { StorefrontCatalogController } from './storefront-catalog.controller';

@Module({
  controllers: [StorefrontCatalogController],
  providers: [StorefrontCatalogService],
  exports: [StorefrontCatalogService],
})
export class StorefrontCatalogModule {}
