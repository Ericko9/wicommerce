import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService, UpdateTenantSettingDto } from './tenant.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantRole } from '@ucp/database';

@ApiTags('Tenant Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenant/settings')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @Roles(TenantRole.OWNER, TenantRole.ADMIN, TenantRole.STAFF)
  @ApiOperation({ summary: 'Get current tenant settings' })
  async getSettings(@CurrentTenant() tenant: any, @CurrentUser() user: any) {
    const tenantId = tenant?.id || user?.tenantId;
    return this.tenantService.getSettings(tenantId);
  }

  @Patch()
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Update tenant settings' })
  async updateSettings(
    @Body() dto: UpdateTenantSettingDto,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ) {
    const tenantId = tenant?.id || user?.tenantId;
    return this.tenantService.updateSettings(tenantId, dto);
  }
}
