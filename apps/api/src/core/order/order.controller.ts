import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { OrderQueryDto } from './dto/order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantRole } from '@ucp/database';

@ApiTags('Admin Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @Roles(TenantRole.OWNER, TenantRole.ADMIN, TenantRole.STAFF, TenantRole.CASHIER)
  @ApiOperation({ summary: 'List orders for admin' })
  async getOrders(
    @Query() query: OrderQueryDto,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ): Promise<any> {
    const tenantId = tenant?.id || user?.tenantId;
    return this.orderService.getAdminOrders(tenantId, query);
  }

  @Get(':id')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN, TenantRole.STAFF, TenantRole.CASHIER)
  @ApiOperation({ summary: 'Get order detail by ID' })
  async getOrder(
    @Param('id') id: string,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ): Promise<any> {
    const tenantId = tenant?.id || user?.tenantId;
    return this.orderService.getAdminOrderById(tenantId, id);
  }

  @Post(':id/confirm-payment')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Confirm manual payment for pending order' })
  async confirmPayment(
    @Param('id') id: string,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ): Promise<any> {
    const tenantId = tenant?.id || user?.tenantId;
    return this.orderService.confirmManualPayment(tenantId, id, user?.id);
  }

  @Patch(':id/status')
  @Roles(TenantRole.OWNER, TenantRole.ADMIN, TenantRole.STAFF)
  @ApiOperation({ summary: 'Update order status with state machine validation' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ): Promise<any> {
    const tenantId = tenant?.id || user?.tenantId;
    return this.orderService.updateOrderStatus(tenantId, id, dto.status, dto.note, user?.id);
  }
}
