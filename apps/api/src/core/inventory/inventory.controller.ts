import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantRole } from '@ucp/database';

@ApiTags('Admin Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(TenantRole.OWNER, TenantRole.ADMIN, TenantRole.STAFF)
  @ApiOperation({ summary: 'Get stock per product for admin' })
  async getInventory(@CurrentTenant() tenant: any, @CurrentUser() user: any) {
    const tenantId = tenant?.id || user?.tenantId;
    return this.inventoryService.getInventory(tenantId);
  }

  @Post('adjust')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Manual stock adjustment (IN, OUT, SET)' })
  async adjustInventory(
    @Body() dto: AdjustInventoryDto,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ) {
    const tenantId = tenant?.id || user?.tenantId;
    return this.inventoryService.adjustInventory(tenantId, dto);
  }
}
