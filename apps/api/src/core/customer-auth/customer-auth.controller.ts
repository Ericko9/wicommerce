import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerAuthService } from './customer-auth.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Storefront Customer Auth')
@Controller('storefront/auth')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new customer for tenant storefront' })
  async register(@Body() dto: RegisterCustomerDto, @CurrentTenant() tenant: any) {
    return this.customerAuthService.registerCustomer(tenant?.id, dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login customer for tenant storefront' })
  async login(@Body() dto: LoginCustomerDto, @CurrentTenant() tenant: any) {
    return this.customerAuthService.loginCustomer(tenant?.id, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('customer-jwt'))
  @ApiOperation({ summary: 'Get current logged-in customer profile' })
  async getProfile(@CurrentUser() user: any) {
    return user;
  }
}
