import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CartService } from './cart.service';
import { CheckoutDto } from './dto/checkout.dto';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Public Storefront Checkout & Cart')
@Controller('storefront')
export class StorefrontOrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly cartService: CartService,
  ) {}

  @Get('cart')
  @ApiOperation({ summary: 'Get current shopping cart' })
  async getCart(@Headers('x-cart-id') cartId: string, @CurrentTenant() tenant: any) {
    const activeCartId = cartId || 'guest-session';
    return this.cartService.getCart(tenant?.id, activeCartId);
  }

  @Post('cart/items')
  @ApiOperation({ summary: 'Add item to cart' })
  async addToCart(
    @Headers('x-cart-id') cartId: string,
    @Body() dto: AddToCartDto,
    @CurrentTenant() tenant: any,
  ) {
    const activeCartId = cartId || 'guest-session';
    return this.cartService.addItem(tenant?.id, activeCartId, dto);
  }

  @Patch('cart/items/:productId')
  @ApiOperation({ summary: 'Update item quantity in cart' })
  async updateCartItem(
    @Param('productId') productId: string,
    @Headers('x-cart-id') cartId: string,
    @Body() dto: UpdateCartItemDto,
    @Query('variantId') queryVariantId: string,
    @CurrentTenant() tenant: any,
  ) {
    const activeCartId = cartId || 'guest-session';
    const variantId = dto.variantId || queryVariantId;
    return this.cartService.updateItemQuantity(tenant?.id, activeCartId, productId, dto.quantity, variantId);
  }

  @Delete('cart/items/:productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeCartItem(
    @Param('productId') productId: string,
    @Headers('x-cart-id') cartId: string,
    @Query('variantId') variantId: string,
    @CurrentTenant() tenant: any,
  ) {
    const activeCartId = cartId || 'guest-session';
    return this.cartService.removeItem(tenant?.id, activeCartId, productId, variantId);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Submit checkout and create order (Guest or Customer)' })
  async checkout(
    @Body() dto: CheckoutDto,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ): Promise<any> {
    const customerId = user?.type === 'customer' ? user.id : null;
    return this.orderService.createCheckout(tenant?.id, customerId, dto);
  }

  @Get('orders')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('customer-jwt'))
  @ApiOperation({ summary: 'Get order history for logged in customer' })
  async getCustomerOrders(
    @Query() query: OrderQueryDto,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.orderService.getCustomerOrders(tenant?.id, user.id, query);
  }

  @Get('orders/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('customer-jwt'))
  @ApiOperation({ summary: 'Get order details for logged in customer' })
  async getCustomerOrderById(
    @Param('id') id: string,
    @CurrentTenant() tenant: any,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.orderService.getCustomerOrderById(tenant?.id, user.id, id);
  }
}
