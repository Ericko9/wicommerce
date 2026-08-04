import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CartService } from './cart.service';
import { CheckoutDto } from './dto/checkout.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrderStatus, ProductStatus } from '@ucp/database';

import { PaymentGatewayService } from '../../modules/payment-gateway/payment-gateway.service';

export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CANCELLED, OrderStatus.EXPIRED],
  [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.EXPIRED]: [],
};

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly paymentGatewayService: PaymentGatewayService,
  ) {}

  async createCheckout(tenantId: string, customerId: string | null, dto: CheckoutDto): Promise<any> {
    if (!tenantId) {
      throw new BadRequestException('Context tenant tidak ditemukan');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Checkout membutuhkan minimal 1 item');
    }

    const settings = await this.prisma.tenantSetting.findUnique({
      where: { tenantId },
    });

    const paymentDueHours = settings?.paymentDueHours || 24;
    const paymentDueAt = new Date(Date.now() + paymentDueHours * 60 * 60 * 1000);

    let defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { tenantId, isDefault: true },
    });

    if (!defaultWarehouse) {
      defaultWarehouse = await this.prisma.warehouse.create({
        data: {
          tenantId,
          name: 'Gudang Utama',
          isDefault: true,
        },
      });
    }

    const warehouseId = defaultWarehouse.id;

    // Execute atomic transaction for checkout
    return this.prisma.$transaction(async (tx) => {
      // Resolve or create guest customer if customerId is null
      let targetCustomerId = customerId;
      if (!targetCustomerId) {
        const guestEmail = `${dto.shippingAddress.phone}@guest.local`;
        let guest = await tx.customer.findUnique({
          where: { tenantId_email: { tenantId, email: guestEmail } },
        });

        if (!guest) {
          guest = await tx.customer.create({
            data: {
              tenantId,
              name: dto.shippingAddress.recipient,
              email: guestEmail,
              phone: dto.shippingAddress.phone,
            },
          });
        }
        targetCustomerId = guest.id;
      }

      let subtotal = 0;
      const orderItemsData: any[] = [];

      for (const itemDto of dto.items) {
        const product = await tx.product.findFirst({
          where: {
            id: itemDto.productId,
            tenantId,
            status: ProductStatus.ACTIVE,
            deletedAt: null,
          },
          include: {
            variants: true,
          },
        });

        if (!product) {
          throw new NotFoundException(`Produk ID '${itemDto.productId}' tidak ditemukan atau tidak aktif`);
        }

        let selectedVariant: any = null;
        if (itemDto.variantId) {
          selectedVariant = product.variants.find((v) => v.id === itemDto.variantId);
          if (!selectedVariant) {
            throw new NotFoundException(`Varian ID '${itemDto.variantId}' tidak ditemukan untuk produk '${product.name}'`);
          }
        }

        // 1. Primary lookup: Exact match for variantId or null
        let inv = await tx.inventoryItem.findFirst({
          where: {
            tenantId,
            productId: product.id,
            variantId: itemDto.variantId || selectedVariant?.id || null,
            warehouseId,
          },
        });

        // 2. Fallback A: If variant stock is insufficient or missing, check base product stock (variantId: null)
        if (!inv || inv.quantity < itemDto.quantity) {
          const baseInv = await tx.inventoryItem.findFirst({
            where: {
              tenantId,
              productId: product.id,
              variantId: null,
              warehouseId,
            },
          });
          if (baseInv && baseInv.quantity >= itemDto.quantity) {
            inv = baseInv;
          }
        }

        // 3. Fallback B: If still insufficient stock, check ANY inventory item for this product in default warehouse with sufficient stock
        if (!inv || inv.quantity < itemDto.quantity) {
          const anyInv = await tx.inventoryItem.findFirst({
            where: {
              tenantId,
              productId: product.id,
              warehouseId,
              quantity: { gte: itemDto.quantity },
            },
          });
          if (anyInv) {
            inv = anyInv;
          }
        }

        // 4. Fallback C: Pick the inventory record for this product with highest quantity
        if (!inv) {
          inv = await tx.inventoryItem.findFirst({
            where: {
              tenantId,
              productId: product.id,
              warehouseId,
            },
            orderBy: { quantity: 'desc' },
          });
        }

        const currentStock = inv ? inv.quantity : 0;
        if (currentStock < itemDto.quantity) {
          throw new BadRequestException(
            `Stok untuk produk '${product.name}' ${selectedVariant ? `(${selectedVariant.name})` : ''} tidak mencukupi (Tersedia: ${currentStock}, Diminta: ${itemDto.quantity})`,
          );
        }

        const unitPrice = selectedVariant?.price !== null && selectedVariant?.price !== undefined
          ? selectedVariant.price
          : product.basePrice;

        const itemSubtotal = unitPrice * itemDto.quantity;
        subtotal += itemSubtotal;

        const productNameSnapshot = selectedVariant
          ? `${product.name} - ${selectedVariant.name}`
          : product.name;

        orderItemsData.push({
          productId: product.id,
          variantId: selectedVariant?.id || inv?.variantId || null,
          productNameSnapshot,
          priceSnapshot: unitPrice,
          quantity: itemDto.quantity,
          subtotal: itemSubtotal,
        });

        // Decrement stock atomically with concurrency protection
        if (inv) {
          const updatedInv = await tx.inventoryItem.updateMany({
            where: {
              id: inv.id,
              quantity: { gte: itemDto.quantity },
            },
            data: {
              quantity: { decrement: itemDto.quantity },
            },
          });

          if (updatedInv.count === 0) {
            throw new BadRequestException(
              `Stok untuk produk '${product.name}' tidak mencukupi atau telah berubah saat transaksi (Tersedia: ${currentStock}, Diminta: ${itemDto.quantity})`,
            );
          }
        }
      }

      const totalAmount = subtotal; // manual shipping cost defaults to 0 in core
      const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const order = await tx.order.create({
        data: {
          tenantId,
          customerId: targetCustomerId,
          orderNumber,
          status: OrderStatus.PENDING_PAYMENT,
          subtotal,
          discountTotal: 0,
          shippingCost: 0,
          totalAmount,
          paymentMethod: dto.paymentMethod,
          shippingAddress: JSON.parse(JSON.stringify(dto.shippingAddress)),
          paymentDueAt,
          items: {
            create: orderItemsData,
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: OrderStatus.PENDING_PAYMENT,
              note: 'Order dibuat via checkout',
            },
          },
          payment: {
            create: {
              provider: 'manual',
              amount: totalAmount,
              status: 'PENDING',
            },
          },
        },
        include: {
          items: true,
          payment: true,
          statusHistory: true,
        },
      });

      if (dto.cartId) {
        await this.cartService.clearCart(tenantId, dto.cartId);
      }

      let gatewayResult = null;
      if (dto.paymentMethod === ('midtrans' as any)) {
        gatewayResult = await this.paymentGatewayService.createMidtransSnapTransaction(tenantId, order);
      } else if (dto.paymentMethod === ('xendit' as any)) {
        gatewayResult = await this.paymentGatewayService.createXenditInvoiceTransaction(tenantId, order);
      }

      return {
        order,
        paymentInstructions: gatewayResult || {
          method: dto.paymentMethod,
          amount: totalAmount,
          paymentDueAt,
          instructions:
            dto.paymentMethod === 'manual_transfer'
              ? 'Silakan transfer ke rekening BCA 123-456-7890 a.n Toko UMKM.'
              : 'Pembayaran dilakukan saat barang diterima (COD).',
        },
      };
    });
  }

  async getAdminOrders(tenantId: string, query: OrderQueryDto): Promise<any> {
    const page = Math.max(1, query.page || 1);
    const rawLimit = query.limit || 20;
    const limit = Math.min(Math.max(1, Number(rawLimit)), 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.orderNumber) {
      where.orderNumber = { contains: query.orderNumber, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          items: true,
          payment: true,
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAdminOrderById(tenantId: string, id: string): Promise<any> {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        items: true,
        payment: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }

    return order;
  }

  async confirmManualPayment(tenantId: string, orderId: string, adminId?: string): Promise<any> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Konfirmasi pembayaran hanya dapat dilakukan untuk status PENDING_PAYMENT (Status saat ini: ${order.status})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAID },
      });

      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: {
            status: 'SUCCESS',
            paidAt: new Date(),
          },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: OrderStatus.PENDING_PAYMENT,
          toStatus: OrderStatus.PAID,
          actorId: adminId || null,
          note: 'Pembayaran manual dikonfirmasi oleh admin',
        },
      });

      return updatedOrder;
    });
  }

  async updateOrderStatus(
    tenantId: string,
    orderId: string,
    newStatus: OrderStatus,
    note?: string,
    actorId?: string,
  ): Promise<any> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }

    const currentStatus = order.status;

    if (currentStatus === newStatus) {
      return order;
    }

    const allowedNextStatuses = VALID_ORDER_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Transisi status dari '${currentStatus}' ke '${newStatus}' tidak diperbolehkan.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // If status changes to CANCELLED or EXPIRED, restore stock
      if (newStatus === OrderStatus.CANCELLED || newStatus === OrderStatus.EXPIRED) {
        const defaultWarehouse = await tx.warehouse.findFirst({
          where: { tenantId, isDefault: true },
        });

        if (defaultWarehouse) {
          for (const item of order.items) {
            const inv = await tx.inventoryItem.findFirst({
              where: {
                tenantId,
                productId: item.productId,
                variantId: item.variantId || null,
                warehouseId: defaultWarehouse.id,
              },
            });

            if (inv) {
              await tx.inventoryItem.update({
                where: { id: inv.id },
                data: { quantity: inv.quantity + item.quantity },
              });
            }
          }
        }
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: currentStatus,
          toStatus: newStatus,
          actorId: actorId || null,
          note: note || `Status diperbarui menjadi ${newStatus}`,
        },
      });

      return updated;
    });
  }

  async getCustomerOrders(tenantId: string, customerId: string, query: OrderQueryDto): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, customerId };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          payment: true,
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCustomerOrderById(tenantId: string, customerId: string, id: string): Promise<any> {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId, customerId },
      include: {
        items: true,
        payment: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan');
    }

    return order;
  }

  async processExpiredOrders() {
    const now = new Date();
    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        paymentDueAt: { lt: now },
      },
      include: { items: true },
    });

    let processedCount = 0;
    for (const order of expiredOrders) {
      await this.updateOrderStatus(
        order.tenantId,
        order.id,
        OrderStatus.EXPIRED,
        'Auto-expired due to payment timeout',
        undefined,
      );
      processedCount++;
    }

    return { processedCount };
  }
}
