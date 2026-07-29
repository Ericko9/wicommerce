import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantRole } from '@ucp/database';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class RequestImageUploadDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  fileType!: string;
}

export class AddImageDto {
  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

@ApiTags('Admin Catalog - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FeatureFlagGuard, RolesGuard)
@Controller('admin/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @Roles(TenantRole.OWNER, TenantRole.ADMIN, TenantRole.STAFF)
  @ApiOperation({ summary: 'List products for admin' })
  async getProducts(
    @Query() query: ProductQueryDto,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ) {
    const tenantId = tenant?.id || user?.tenantId;
    return this.productService.getProducts(tenantId, query);
  }

  @Post()
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Create new product' })
  async createProduct(
    @Body() dto: CreateProductDto,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ) {
    const tenantId = tenant?.id || user?.tenantId;
    return this.productService.createProduct(tenantId, dto);
  }

  @Get(':id')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN, TenantRole.STAFF)
  @ApiOperation({ summary: 'Get product detail by ID' })
  async getProduct(
    @Param('id') id: string,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ): Promise<any> {
    const tenantId = tenant?.id || user?.tenantId;
    return this.productService.getProductById(tenantId, id);
  }

  @Patch(':id')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Update product' })
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ) {
    const tenantId = tenant?.id || user?.tenantId;
    return this.productService.updateProduct(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Delete product (soft-delete)' })
  async deleteProduct(
    @Param('id') id: string,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ) {
    const tenantId = tenant?.id || user?.tenantId;
    return this.productService.deleteProduct(tenantId, id);
  }

  @Post(':id/images/presigned-url')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Get presigned URL for product image upload' })
  async getPresignedUrl(
    @Param('id') id: string,
    @Body() dto: RequestImageUploadDto,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ) {
    const tenantId = tenant?.id || user?.tenantId;
    return this.productService.getPresignedImageUploadUrl(tenantId, id, dto.fileName, dto.fileType);
  }

  @Post(':id/images')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Add uploaded image URL to product' })
  async addImage(
    @Param('id') id: string,
    @Body() dto: AddImageDto,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ) {
    const tenantId = tenant?.id || user?.tenantId;
    return this.productService.addProductImage(tenantId, id, dto.url, dto.sortOrder);
  }

  @Delete(':id/images/:imageId')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Delete product image' })
  async deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ) {
    const tenantId = tenant?.id || user?.tenantId;
    return this.productService.deleteProductImage(tenantId, id, imageId);
  }

  // =========================================
  // PRODUCT VARIANTS (Requires 'product_variants' feature)
  // =========================================

  @Get(':id/variants')
  @RequireFeature('product_variants')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN, TenantRole.STAFF)
  @ApiOperation({ summary: 'Get list of product variants' })
  async getVariants(
    @Param('id') id: string,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ): Promise<any> {
    const tenantId = tenant?.id || user?.tenantId;
    return this.productService.getVariants(tenantId, id);
  }

  @Post(':id/variants')
  @RequireFeature('product_variants')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Create new product variant' })
  async createVariant(
    @Param('id') id: string,
    @Body() dto: import('./dto/variant.dto').CreateVariantDto,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ): Promise<any> {
    const tenantId = tenant?.id || user?.tenantId;
    return this.productService.createVariant(tenantId, id, dto);
  }

  @Patch(':id/variants/:variantId')
  @RequireFeature('product_variants')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Update product variant' })
  async updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: import('./dto/variant.dto').UpdateVariantDto,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ): Promise<any> {
    const tenantId = tenant?.id || user?.tenantId;
    return this.productService.updateVariant(tenantId, id, variantId, dto);
  }

  @Delete(':id/variants/:variantId')
  @RequireFeature('product_variants')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Delete product variant' })
  async deleteVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ): Promise<any> {
    const tenantId = tenant?.id || user?.tenantId;
    return this.productService.deleteVariant(tenantId, id, variantId);
  }
}
