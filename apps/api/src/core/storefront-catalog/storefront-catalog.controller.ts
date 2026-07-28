import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StorefrontCatalogService } from './storefront-catalog.service';
import { ProductQueryDto } from '../catalog/dto/product-query.dto';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Public Storefront Catalog')
@Controller('storefront')
export class StorefrontCatalogController {
  constructor(private readonly storefrontService: StorefrontCatalogService) {}

  @Get('store-info')
  @ApiOperation({ summary: 'Get public store information and active features' })
  async getStoreInfo(@CurrentTenant() tenant: any) {
    return this.storefrontService.getStoreInfo(tenant?.id);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get public category list for storefront' })
  async getCategories(@CurrentTenant() tenant: any) {
    return this.storefrontService.getCategories(tenant?.id);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get public active products list' })
  async getProducts(@Query() query: ProductQueryDto, @CurrentTenant() tenant: any) {
    return this.storefrontService.getProducts(tenant?.id, query);
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'Get public product details by slug' })
  async getProductBySlug(@Param('slug') slug: string, @CurrentTenant() tenant: any): Promise<any> {
    return this.storefrontService.getProductBySlug(tenant?.id, slug);
  }
}
