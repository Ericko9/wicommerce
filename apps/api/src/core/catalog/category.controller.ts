import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantRole } from '@ucp/database';

@ApiTags('Admin Catalog - Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @Roles(TenantRole.OWNER, TenantRole.ADMIN, TenantRole.STAFF)
  @ApiOperation({ summary: 'Get all categories for tenant' })
  async getCategories(@CurrentTenant() tenant: any, @CurrentUser() user: any) {
    const tenantId = tenant?.id || user?.tenantId;
    return this.categoryService.getCategories(tenantId);
  }

  @Post()
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Create new category' })
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ) {
    const tenantId = tenant?.id || user?.tenantId;
    return this.categoryService.createCategory(tenantId, dto);
  }

  @Patch(':id')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Update category' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ) {
    const tenantId = tenant?.id || user?.tenantId;
    return this.categoryService.updateCategory(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Delete category' })
  async deleteCategory(
    @Param('id') id: string,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ) {
    const tenantId = tenant?.id || user?.tenantId;
    return this.categoryService.deleteCategory(tenantId, id);
  }
}
