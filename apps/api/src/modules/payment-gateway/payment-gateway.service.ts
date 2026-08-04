import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { encryptConfig, decryptConfig } from '@ucp/utils';
import { MidtransConfigDto } from './dto/midtrans-config.dto';
import { XenditConfigDto } from './dto/xendit-config.dto';
import { OrderStatus } from '@ucp/database';

@Injectable()
export class PaymentGatewayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}

  private getSecretKey(): string {
    return (
      this.configService.get<string>('ENCRYPTION_SECRET_KEY') ||
      'super-secret-encryption-key-for-db-at-rest'
    );
  }

  async saveGatewayConfig(
    tenantId: string,
    featureKey: string,
    configDto: MidtransConfigDto | XenditConfigDto,
  ): Promise<any> {
    if (!['payment_midtrans', 'payment_xendit'].includes(featureKey)) {
      throw new BadRequestException(`Feature key '${featureKey}' bukan payment gateway yang valid.`);
    }

    const feature = await this.prisma.feature.findUnique({
      where: { key: featureKey },
    });

    if (!feature) {
      throw new NotFoundException(`Fitur '${featureKey}' tidak ditemukan di sistem.`);
    }

    const encryptedString = encryptConfig(configDto, this.getSecretKey());

    const tenantFeature = await this.prisma.tenantFeature.upsert({
      where: {
        tenantId_featureId: {
          tenantId,
          featureId: feature.id,
        },
      },
      update: {
        config: encryptedString,
        isEnabled: true,
      },
      create: {
        tenantId,
        featureId: feature.id,
        isEnabled: true,
        config: encryptedString,
      },
    });

    // Invalidate Redis cache
    await this.redis.del(`feature:${tenantId}:${featureKey}`);

    return {
      message: `Konfigurasi ${featureKey} berhasil disimpan dan dienkripsi.`,
      featureKey,
      isEnabled: tenantFeature.isEnabled,
    };
  }

  async getGatewayConfig<T = any>(tenantId: string, featureKey: string): Promise<T | null> {
    const tf = await this.prisma.tenantFeature.findFirst({
      where: {
        tenantId,
        feature: { key: featureKey },
        isEnabled: true,
      },
    });

    if (!tf || !tf.config) {
      return null;
    }

    try {
      const rawConfig = typeof tf.config === 'string' ? tf.config : JSON.stringify(tf.config);
      return decryptConfig<T>(rawConfig, this.getSecretKey());
    } catch {
      return null;
    }
  }

  async createMidtransSnapTransaction(tenantId: string, order: any): Promise<any> {
    const config = await this.getGatewayConfig<MidtransConfigDto>(tenantId, 'payment_midtrans');
    if (!config) {
      throw new BadRequestException('Metode pembayaran Midtrans tidak aktif untuk toko ini');
    }

    const snapToken = `SNAP-MOCK-${Date.now()}-${order.id.substring(0, 5)}`;
    const redirectUrl = config.isProduction
      ? `https://app.midtrans.com/snap/v2/vtweb/${snapToken}`
      : `https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapToken}`;

    return {
      provider: 'midtrans',
      snapToken,
      redirectUrl,
    };
  }

  async createXenditInvoiceTransaction(tenantId: string, order: any): Promise<any> {
    const config = await this.getGatewayConfig<XenditConfigDto>(tenantId, 'payment_xendit');
    if (!config) {
      throw new BadRequestException('Metode pembayaran Xendit tidak aktif untuk toko ini');
    }

    const invoiceUrl = `https://checkout.xendit.co/web/invoice-${Date.now()}`;

    return {
      provider: 'xendit',
      invoiceUrl,
    };
  }

  async handleMidtransWebhook(payload: any): Promise<any> {
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = payload;

    if (!order_id) {
      throw new BadRequestException('Payload Midtrans tidak memiliki order_id');
    }

    const order = await this.prisma.order.findFirst({
      where: { orderNumber: order_id },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException(`Order '${order_id}' tidak ditemukan`);
    }

    const config = await this.getGatewayConfig<MidtransConfigDto>(order.tenantId, 'payment_midtrans');
    if (!config || !config.serverKey) {
      throw new UnauthorizedException('Kredensial Midtrans belum dikonfigurasi untuk toko ini');
    }

    if (!signature_key) {
      throw new UnauthorizedException('Signature key wajib disertakan dalam webhook Midtrans');
    }

    const grossAmountNum = Number(gross_amount);
    const expectedGrossAmountStr = typeof gross_amount === 'number' ? gross_amount.toFixed(2) : String(gross_amount);
    const payloadString = `${order_id}${status_code}${expectedGrossAmountStr}${config.serverKey}`;
    const expectedSignature = crypto.createHash('sha512').update(payloadString).digest('hex');

    if (signature_key !== expectedSignature) {
      throw new UnauthorizedException('Signature Key Midtrans tidak valid');
    }

    if (Math.abs(grossAmountNum - Number(order.totalAmount)) > 0.01) {
      throw new BadRequestException(
        `Jumlah pembayaran webhook (${grossAmountNum}) tidak sesuai dengan total tagihan order (${order.totalAmount})`,
      );
    }

    // Idempotency check: if payment already SUCCESS, return early
    if (order.payment && order.payment.status === 'SUCCESS') {
      return { status: 'SUCCESS', message: 'Order sudah lunas (idempotent)' };
    }

    if (['settlement', 'capture'].includes(transaction_status)) {
      return this.prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PAID },
        });

        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: {
              status: 'SUCCESS',
              externalRef: payload.transaction_id || null,
              paidAt: new Date(),
              rawPayload: payload,
            },
          });
        }

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: OrderStatus.PAID,
            actorId: null,
            note: 'Pembayaran Midtrans berhasil via Webhook',
          },
        });

        return { status: 'SUCCESS', order: updatedOrder };
      });
    } else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      const nextStatus = transaction_status === 'expire' ? OrderStatus.EXPIRED : OrderStatus.CANCELLED;
      return this.prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: { status: nextStatus },
        });

        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: { status: 'FAILED', rawPayload: payload },
          });
        }

        return { status: nextStatus, order: updatedOrder };
      });
    }

    return { status: 'PENDING', message: 'Status pembayaran dalam proses' };
  }

  async handleXenditWebhook(callbackTokenHeader: string, payload: any): Promise<any> {
    const { external_id, status } = payload;

    if (!external_id) {
      throw new BadRequestException('Payload Xendit tidak memiliki external_id');
    }

    const order = await this.prisma.order.findFirst({
      where: { orderNumber: external_id },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException(`Order '${external_id}' tidak ditemukan`);
    }

    const config = await this.getGatewayConfig<XenditConfigDto>(order.tenantId, 'payment_xendit');
    if (config && config.webhookVerificationToken) {
      if (callbackTokenHeader !== config.webhookVerificationToken) {
        throw new UnauthorizedException('Callback token Xendit tidak valid');
      }
    }

    // Idempotency check: if payment already SUCCESS, return early
    if (order.payment && order.payment.status === 'SUCCESS') {
      return { status: 'SUCCESS', message: 'Order sudah lunas (idempotent)' };
    }

    if (status === 'PAID' || status === 'SETTLED') {
      return this.prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PAID },
        });

        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: {
              status: 'SUCCESS',
              externalRef: payload.id || null,
              paidAt: new Date(),
              rawPayload: payload,
            },
          });
        }

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: OrderStatus.PAID,
            actorId: null,
            note: 'Pembayaran Xendit berhasil via Webhook',
          },
        });

        return { status: 'SUCCESS', order: updatedOrder };
      });
    } else if (status === 'EXPIRED') {
      return this.prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.EXPIRED },
        });

        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: { status: 'FAILED', rawPayload: payload },
          });
        }

        return { status: OrderStatus.EXPIRED, order: updatedOrder };
      });
    }

    return { status: 'PENDING' };
  }
}
