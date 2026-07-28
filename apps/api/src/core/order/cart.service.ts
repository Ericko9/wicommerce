import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddToCartDto } from './dto/cart.dto';
import { ProductStatus } from '@ucp/database';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  imageUrl?: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  totalQuantity: number;
}

@Injectable()
export class CartService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  private getCartKey(tenantId: string, cartId: string) {
    return `cart:${tenantId}:${cartId}`;
  }

  async getCart(tenantId: string, cartId: string): Promise<Cart> {
    const key = this.getCartKey(tenantId, cartId);
    const raw = await this.redis.get(key);
    if (!raw) {
      return { items: [], subtotal: 0, totalQuantity: 0 };
    }
    try {
      return JSON.parse(raw);
    } catch {
      return { items: [], subtotal: 0, totalQuantity: 0 };
    }
  }

  async addItem(tenantId: string, cartId: string, dto: AddToCartDto): Promise<Cart> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.productId,
        tenantId,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan atau tidak aktif');
    }

    const cart = await this.getCart(tenantId, cartId);
    const existingIndex = cart.items.findIndex((i) => i.productId === dto.productId);

    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity += dto.quantity;
      cart.items[existingIndex].subtotal = cart.items[existingIndex].quantity * product.basePrice;
    } else {
      cart.items.push({
        productId: product.id,
        name: product.name,
        price: product.basePrice,
        quantity: dto.quantity,
        subtotal: product.basePrice * dto.quantity,
        imageUrl: product.images[0]?.url,
      });
    }

    return this.saveCart(tenantId, cartId, cart);
  }

  async updateItemQuantity(
    tenantId: string,
    cartId: string,
    productId: string,
    quantity: number,
  ): Promise<Cart> {
    const cart = await this.getCart(tenantId, cartId);
    const item = cart.items.find((i) => i.productId === productId);

    if (!item) {
      throw new NotFoundException('Item tidak ada di keranjang');
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i.productId !== productId);
    } else {
      item.quantity = quantity;
      item.subtotal = item.quantity * item.price;
    }

    return this.saveCart(tenantId, cartId, cart);
  }

  async removeItem(tenantId: string, cartId: string, productId: string): Promise<Cart> {
    const cart = await this.getCart(tenantId, cartId);
    cart.items = cart.items.filter((i) => i.productId !== productId);
    return this.saveCart(tenantId, cartId, cart);
  }

  async clearCart(tenantId: string, cartId: string): Promise<Cart> {
    const key = this.getCartKey(tenantId, cartId);
    await this.redis.del(key);
    return { items: [], subtotal: 0, totalQuantity: 0 };
  }

  private async saveCart(tenantId: string, cartId: string, cart: Cart): Promise<Cart> {
    cart.subtotal = cart.items.reduce((acc, i) => acc + i.subtotal, 0);
    cart.totalQuantity = cart.items.reduce((acc, i) => acc + i.quantity, 0);

    const key = this.getCartKey(tenantId, cartId);
    await this.redis.set(key, JSON.stringify(cart), 604800);
    return cart;
  }
}
