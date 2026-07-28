import { Controller, Post, Patch, Body, Param, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentGatewayService } from './payment-gateway.service';
import { MidtransConfigDto } from './dto/midtrans-config.dto';
import { XenditConfigDto } from './dto/xendit-config.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantRole } from '@ucp/database';

@ApiTags('Payment Gateway')
@Controller()
export class PaymentGatewayController {
  constructor(private readonly paymentGatewayService: PaymentGatewayService) {}

  @Patch('admin/payments/config/:featureKey')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TenantRole.OWNER, TenantRole.ADMIN)
  @ApiOperation({ summary: 'Save and encrypt tenant payment gateway API credentials' })
  async saveConfig(
    @Param('featureKey') featureKey: string,
    @Body() dto: MidtransConfigDto | XenditConfigDto,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ): Promise<any> {
    const tenantId = tenant?.id || user?.tenantId;
    return this.paymentGatewayService.saveGatewayConfig(tenantId, featureKey, dto);
  }

  @Post('storefront/payment/webhook/midtrans')
  @ApiOperation({ summary: 'Public Midtrans Payment Webhook Callback' })
  async midtransWebhook(@Body() payload: any): Promise<any> {
    return this.paymentGatewayService.handleMidtransWebhook(payload);
  }

  @Post('storefront/payment/webhook/xendit')
  @ApiOperation({ summary: 'Public Xendit Payment Webhook Callback' })
  async xenditWebhook(
    @Headers('x-callback-token') callbackToken: string,
    @Body() payload: any,
  ): Promise<any> {
    return this.paymentGatewayService.handleXenditWebhook(callbackToken, payload);
  }
}
