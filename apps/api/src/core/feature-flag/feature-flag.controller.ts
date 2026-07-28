import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeatureFlagService } from './feature-flag.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { TenantRole } from '@ucp/database';
import { IsBoolean } from 'class-validator';

export class ToggleFeatureDto {
  @IsBoolean()
  isEnabled!: boolean;
}

@ApiTags('Features Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/features')
export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Get()
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Get all features and status for tenant' })
  async getFeatures(@CurrentTenant() tenant: any, @CurrentUser() user: any): Promise<any[]> {
    const tenantId = tenant?.id || user?.tenantId;
    return this.featureFlagService.getTenantFeatures(tenantId);
  }

  @Patch(':key/toggle')
  @Roles(TenantRole.OWNER)
  @ApiOperation({ summary: 'Toggle feature status (ON/OFF)' })
  async toggleFeature(
    @Param('key') key: string,
    @Body() dto: ToggleFeatureDto,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ) {
    const tenantId = tenant?.id || user?.tenantId;
    return this.featureFlagService.toggleFeature(tenantId, key, dto.isEnabled, user?.id);
  }
}
