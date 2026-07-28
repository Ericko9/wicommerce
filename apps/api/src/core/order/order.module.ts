import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { CartService } from './cart.service';
import { OrderController } from './order.controller';
import { StorefrontOrderController } from './storefront-order.controller';
import { PaymentGatewayModule } from '../../modules/payment-gateway/payment-gateway.module';

@Module({
  imports: [PaymentGatewayModule],
  controllers: [OrderController, StorefrontOrderController],
  providers: [OrderService, CartService],
  exports: [OrderService, CartService],
})
export class OrderModule {}
